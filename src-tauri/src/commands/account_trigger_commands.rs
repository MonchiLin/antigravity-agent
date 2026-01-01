use base64::Engine;
use prost::Message;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use tracing::{info, error, instrument};
use serde_json::Value;
use std::fs;
use tauri::State;

// --- Data Structures ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TriggerResult {
    pub email: String,
    pub triggered_models: Vec<String>,
    pub failed_models: Vec<String>,
    pub skipped_models: Vec<String>, // Models with < 100% quota
    pub skipped_details: Vec<String>,
    pub success: bool,
    pub message: String,
}

#[derive(Deserialize)]
struct RefreshTokenResponse {
    access_token: String,
}

// --- Command ---

#[tauri::command]
#[instrument]
pub async fn trigger_quota_refresh(
    state: State<'_, crate::AppState>,
    email: String,
) -> Result<TriggerResult, String> {
    
    match run_trigger_logic(&state.config_dir, &email).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to trigger refresh for {}: {}", email, e);
            Err(e)
        }
    }
}

pub async fn run_trigger_logic(
    config_dir: &std::path::Path,
    email: &str,
) -> Result<TriggerResult, String> {
    info!("🚀 Check Quota & Trigger Refresh for: {}", email);

    // 1. Load Account & Token
    let (email_str, proto_bytes) = load_account(config_dir, email).await?;
    let (access_token, _user_id) = get_valid_token(email, &proto_bytes).await?;

    // 2. Get Project ID (needed for model calls)
    let project = match fetch_code_assist_project(&access_token).await {
        Ok(p) => p,
        Err(e) => {
            info!("Skipping account {}: No project ID found (Reason: {})", email, e);
            return Ok(TriggerResult {
                email: email_str,
                triggered_models: Vec::new(),
                failed_models: Vec::new(),
                skipped_models: Vec::new(),
                skipped_details: vec![format!("Account {} has no project ID: {}", email, e)],
                success: false,
                message: format!("Skipped: No project ID found for account {}", email),
            });
        }
    };

    // 3. Get Available Models & Quotas
    let models_json = fetch_available_models(&access_token, &project).await?;
    let quotas = parse_quotas(&models_json);

    // 4. Trigger "Hi" for models with 100% quota
    let mut triggered = Vec::new();
    let mut failed = Vec::new();
    let mut skipped = Vec::new();
    let mut skipped_details = Vec::new();

    for item in quotas {
        // Only trigger if quota is effectively full (> 99%)
        // The user said "model with 100% remaining"
        if item.percentage > 0.99 {
            info!("Model {} has full quota ({}%), triggering...", item.model_key, item.percentage * 100.0);
            
            match trigger_minimal_query(&access_token, &project, &item.model_key).await {
                Ok(_) => triggered.push(item.display_name),
                Err(e) => {
                    error!("Failed to trigger {}: {}", item.display_name, e);
                    failed.push(format!("{} ({})", item.display_name, e));
                }
            }
        } else {
            let reason = format!("{} ({:.4}%)", item.display_name, item.percentage * 100.0);
            info!("Skipping {}", reason);
            skipped.push(item.display_name);
            skipped_details.push(reason);
        }
    }

    Ok(TriggerResult {
        email: email_str,
        triggered_models: triggered,
        failed_models: failed,
        skipped_models: skipped,
        skipped_details,
        success: true,
        message: "Refresh cycle check completed".to_string(),
    })
}

// --- Internal Helpers ---

struct ModelQuotaStatus {
    model_key: String,
    display_name: String,
    percentage: f64,
}

fn parse_quotas(models_json: &Value) -> Vec<ModelQuotaStatus> {
    let mut items = Vec::new();
    let models_map = models_json.get("models").and_then(|v| v.as_object());

    if let Some(map) = models_map {
        // Map internal keys to display names
        let targets = vec![
            ("gemini-3-pro-high", "Gemini Pro"),
            ("gemini-3-flash", "Gemini Flash"),
            ("gemini-3-pro-image", "Gemini Image"),
            ("claude-opus-4-5-thinking", "Claude"),
        ];

        for (key, name) in targets {
            if let Some(model_data) = map.get(key) {
                 if let Some(quota_info) = model_data.get("quotaInfo") {
                     let percentage = quota_info.get("remainingFraction").and_then(|v| v.as_f64()).unwrap_or(0.0);
                     
                     items.push(ModelQuotaStatus {
                         model_key: key.to_string(),
                         display_name: name.to_string(),
                         percentage,
                     });
                 }
            }
        }
    }
    items
}

async fn trigger_minimal_query(access_token: &str, project: &str, model_key: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1internal:generateContent", CLOUD_CODE_BASE_URL);

    // Final Payload: Discovered that Variant 2 (wrapped in "request") works
    let body = serde_json::json!({
        "project": project,
        "model": model_key,
        "request": {
            "contents": [
                {
                    "role": "user",
                    "parts": [{ "text": "Hi, this is an automated quota check. Please respond briefly." }]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 50
            }
        }
    });

    let res = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/json")
        .header(USER_AGENT, "antigravity/windows/amd64") 
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("API Error {}: {}", status, text));
    }

    info!("Trigger Success for {}: Status={}", model_key, status);
    Ok(())
}


// --- Shared API Helpers ---

const CLOUD_CODE_BASE_URL: &str = "https://daily-cloudcode-pa.sandbox.googleapis.com";

async fn load_account(
    config_dir: &std::path::Path,
    target_email: &str,
) -> Result<(String, Vec<u8>), String> {
    let antigravity_dir = config_dir.join("antigravity-accounts");
    let path = antigravity_dir.join(format!("{}.json", target_email));

    if !path.exists() {
        return Err(format!("账户文件不存在: {}", path.display()));
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    // More robust json parsing could be used, but reusing logic from metrics command
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(state_str) = json.get("jetskiStateSync.agentManagerInitState").and_then(|v| v.as_str()) {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(state_str.trim())
            .map_err(|e| e.to_string())?;
        
        return Ok((target_email.to_string(), bytes));
    }

    Err("无效的账户文件格式".to_string())
}

async fn get_valid_token(email: &str, proto_bytes: &[u8]) -> Result<(String, String), String> {
    let mut msg = crate::proto::SessionResponse::decode(proto_bytes)
        .map_err(|e| format!("Proto decode failed: {}", e))?;
    
    let auth = msg.auth.as_mut().ok_or("No auth info")?;
    let access_token = auth.access_token.clone();
    let refresh_token = auth.id_token.clone(); 
    let user_id = msg.user_id_raw.clone(); // Or extract from context

    // Check validity by making a quick userinfo call to verify the token works
    if check_token_validity(&access_token).await {
         return Ok((access_token, String::from_utf8_lossy(&user_id).to_string()));
    }

    info!("Token expired for {}, refreshing...", email);
    let new_token = refresh_access_token(&refresh_token).await?;
    Ok((new_token, String::from_utf8_lossy(&user_id).to_string()))
}

async fn check_token_validity(access_token: &str) -> bool {
    // Simple userinfo check
    let client = reqwest::Client::new();
    let res = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .send()
        .await;
    
    match res {
        Ok(r) => r.status().is_success(),
        Err(_) => false,
    }
}

async fn refresh_access_token(refresh_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let params = [
        ("client_id", "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com"),
        ("client_secret", "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"),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ];

    let res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Refresh failed: {}", res.status()));
    }

    let json: RefreshTokenResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(json.access_token)
}

async fn fetch_code_assist_project(access_token: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post(format!("{}/v1internal:loadCodeAssist", CLOUD_CODE_BASE_URL))
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/json")
        .header(USER_AGENT, "antigravity/windows/amd64")
        .body(r#"{"metadata": {"ideType": "ANTIGRAVITY"}}"#)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
         return Err(format!("loadCodeAssist failed status {}: {}", status, text));
    }

    let json: Value = serde_json::from_str(&text).map_err(|e| {
        format!("Failed to parse project response: {} | Raw Body: {:.100}", e, text)
    })?;

    // Try to find project ID in various possible fields
    let project_id = json.get("cloudaicompanionProject")
        .or_else(|| json.get("project"))
        .or_else(|| json.get("projectId"))
        .and_then(|v| v.as_str());

    match project_id {
        Some(id) => Ok(id.to_string()),
        None => Err("Project ID missing in loadCodeAssist response".to_string())
    }
}

async fn fetch_available_models(access_token: &str, project: &str) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({ "project": project });

    let res = client
        .post(format!("{}/v1internal:fetchAvailableModels", CLOUD_CODE_BASE_URL))
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/json")
        .header(USER_AGENT, "antigravity/windows/amd64")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
         return Err(format!("fetchAvailableModels failed status {}: {}", status, text));
    }

    serde_json::from_str(&text).map_err(|e| {
        error!("JSON parse failed for fetchAvailableModels. Raw body: {}", text);
        format!("Failed to parse models JSON: {} | Raw Body: {:.500}", e, text)
    })
}
