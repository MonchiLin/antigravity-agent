use base64::Engine;
use prost::Message;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use tauri::State;
use tracing::{info, instrument};

// --- Data Structures ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuotaItem {
    pub model_name: String,
    pub percentage: f64,
    pub reset_text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountMetrics {
    pub email: String,
    pub user_id: String,
    pub avatar_url: String,
    pub quotas: Vec<QuotaItem>,
}

#[derive(Deserialize)]
struct UserInfoResponse {
    id: String,
    picture: String,
}

#[derive(Deserialize)]
struct LoadCodeAssistResponse {
    #[serde(rename = "cloudaicompanionProject")]
    cloudaicompanion_project: String,
}

#[derive(Deserialize)]
struct RefreshTokenResponse {
    access_token: String,
}

// Minimal structure for Models Response, traversing deep JSON
// We'll use serde_json::Value for flexibility as the structure is complex

// --- Command ---

// --- Command ---

#[tauri::command]
#[instrument]
pub async fn get_account_metrics(
    state: State<'_, crate::AppState>,
    email: String,
) -> Result<AccountMetrics, String> {
    get_metrics_logic(&state.config_dir, email).await
}

pub async fn get_metrics_logic(
    config_dir: &std::path::Path,
    email: String,
) -> Result<AccountMetrics, String> {
    info!("🚀 开始获取账户指标 (Logic), email: {}", email);

    let (email, proto_bytes) = load_account(config_dir, &email).await?;
    process_account(email, proto_bytes).await
}

// --- Helpers ---

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
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(state_str) = json.get("jetskiStateSync.agentManagerInitState").and_then(|v| v.as_str()) {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(state_str.trim())
            .map_err(|e| e.to_string())?;

        // Optional: verify email inside proto matches filename?
        // For performance we can skip full decode if we trust filename, 
        // but let's decode to be safe and consistent with previous logic.
        let msg = crate::proto::SessionResponse::decode(bytes.as_slice())
            .map_err(|e| e.to_string())?;
        
        if let Some(context) = &msg.context {
            if context.email == target_email {
                 return Ok((target_email.to_string(), bytes));
            }
        }
        return Err("账户文件内容不匹配".to_string());
    }

    Err("无效的账户文件格式".to_string())
}

async fn process_account(email: String, proto_bytes: Vec<u8>) -> Result<AccountMetrics, String> {
    // 1. Decode Proto to get tokens
    let mut msg = crate::proto::SessionResponse::decode(proto_bytes.as_slice())
        .map_err(|e| format!("Proto decode failed: {}", e))?;
    
    let auth = msg.auth.as_mut().ok_or("No auth info")?;
    let mut access_token = auth.access_token.clone();
    let refresh_token = auth.id_token.clone(); // Mapped as per observation

    // 2. Fetch User Info (Test Token)
    let user_info = match fetch_user_info(&access_token).await {
        Ok(info) => info,
        Err(_) => {
            info!("Token expired for {}, refreshing...", email);
            // 3. Refresh Token
            let new_token = refresh_access_token(&refresh_token).await?;
            // Update local var
            access_token = new_token.clone();
            // Update Proto struct
            auth.access_token = new_token;
            // info!("new token {} refreshing...", access_token);
            fetch_user_info(&access_token).await.map_err(|e| format!("Retry fetch user info failed: {}", e))?
        }
    };

    // 4. Fetch Models
    let project = fetch_code_assist_project(&access_token)
        .await
        .map_err(|e| format!("获取项目 ID 失败 (fetch_code_assist_project): {}", e))?;

    info!("获取 project 成功 for {}", email);

    let models_json = fetch_available_models(&access_token, &project)
        .await
        .map_err(|e| format!("获取模型列表失败 (fetch_available_models): {}", e))?;

    // 5. Parse Models
    let quotas = parse_quotas(&models_json);

    Ok(AccountMetrics {
        email,
        user_id: user_info.id,
        avatar_url: user_info.picture,
        quotas,
    })
}

// --- API Clients ---

const CLOUD_CODE_BASE_URL: &str = "https://daily-cloudcode-pa.sandbox.googleapis.com";

async fn fetch_user_info(access_token: &str) -> Result<UserInfoResponse, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Status: {}", res.status()));
    }

    res.json::<UserInfoResponse>().await.map_err(|e| e.to_string())
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
        .header(USER_AGENT, "antigravity/windows/amd64") // Imitate existing client
        .body(r#"{"metadata": {"ideType": "ANTIGRAVITY"}}"#)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: LoadCodeAssistResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(json.cloudaicompanion_project)
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

    res.json::<Value>().await.map_err(|e| e.to_string())
}

fn parse_quotas(models_json: &Value) -> Vec<QuotaItem> {
    let mut items = Vec::new();
    let models_map = models_json.get("models").and_then(|v| v.as_object());

    if let Some(map) = models_map {
        // Define mapping of keys to Display Names
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
                     let reset_text = quota_info.get("resetTime").and_then(|v| v.as_str()).unwrap_or("").to_string();
                     
                     items.push(QuotaItem {
                         model_name: name.to_string(),
                         percentage,
                         reset_text,
                     });
                 }
            }
        }
    }
    items
}
