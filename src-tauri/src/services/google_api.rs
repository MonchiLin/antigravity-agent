use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde::Deserialize;
use serde_json::Value;
use std::fs;
use tracing::error;

pub const CLOUD_CODE_BASE_URL: &str = "https://daily-cloudcode-pa.sandbox.googleapis.com";

#[derive(Deserialize)]
pub struct UserInfoResponse {
    pub id: String,
    pub picture: String,
}

#[derive(Deserialize)]
pub struct RefreshTokenResponse {
    pub access_token: String,
}

const CLIENT_ID: &str = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET: &str = "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";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";

pub struct ValidToken {
    pub access_token: String,
    pub user_id: String,
    pub avatar_url: String,
}

pub async fn load_account(
    config_dir: &std::path::Path,
    target_email: &str,
) -> Result<(String, String, Option<String>), String> {
    let antigravity_dir = config_dir.join("antigravity-accounts");
    let path = antigravity_dir.join(format!("{}.json", target_email));

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let auth_status_raw = json
        .get(crate::constants::database::AUTH_STATUS)
        .and_then(|v| v.as_str())
        .ok_or_else(|| "账户文件缺少 antigravityAuthStatus".to_string())?;

    let auth_status_json: Value = serde_json::from_str(auth_status_raw)
        .map_err(|e| format!("解析 antigravityAuthStatus 失败: {}", e))?;

    let oauth_token_raw = json
        .get(crate::constants::database::OAUTH_TOKEN)
        .and_then(|v| v.as_str());

    // 1. 获取 Access Token (优先 OAuth, 回退 API Key)
    let access_token =
        crate::utils::codec::extract_preferred_access_token(oauth_token_raw, &auth_status_json)?;

    // 2. 获取 Email
    let email = auth_status_json
        .get("email")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "antigravityAuthStatus 缺少 email".to_string())?
        .to_string();

    // 3. 提取 Refresh Token
    let refresh_token = crate::utils::codec::extract_refresh_token(oauth_token_raw);

    Ok((email, access_token, refresh_token))
}

pub async fn refresh_access_token(refresh_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let params = [
        ("client_id", CLIENT_ID),
        ("client_secret", CLIENT_SECRET),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ];

    let res = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("刷新 Token 请求失败: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("刷新 Token 失败 ({}): {}", status, text));
    }

    let json: RefreshTokenResponse = res
        .json()
        .await
        .map_err(|e| format!("刷新 Token 响应解析失败: {}", e))?;

    Ok(json.access_token)
}

pub async fn get_valid_token(email: &str, access_token: &str) -> Result<ValidToken, String> {
    let token = access_token.trim();
    if token.is_empty() {
        return Err(format!("{} 的 apiKey 为空", email));
    }

    let info = fetch_user_info(token)
        .await
        .map_err(|e| format!("{} 的 apiKey 校验失败: {}", email, e))?;

    Ok(ValidToken {
        access_token: token.to_string(),
        user_id: info.id,
        avatar_url: info.picture,
    })
}

pub async fn fetch_user_info(access_token: &str) -> Result<UserInfoResponse, String> {
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

    res.json::<UserInfoResponse>()
        .await
        .map_err(|e| e.to_string())
}

pub async fn fetch_code_assist_project(access_token: &str) -> Result<String, String> {
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
        format!(
            "Failed to parse project response: {} | Raw Body: {:.100}",
            e, text
        )
    })?;

    let project_id = json
        .get("cloudaicompanionProject")
        .or_else(|| json.get("project"))
        .or_else(|| json.get("projectId"))
        .and_then(|v| v.as_str());

    match project_id {
        Some(id) => Ok(id.to_string()),
        None => Err("Project ID missing in loadCodeAssist response".to_string()),
    }
}

pub async fn fetch_available_models(access_token: &str, project: &str) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({ "project": project });

    let res = client
        .post(format!(
            "{}/v1internal:fetchAvailableModels",
            CLOUD_CODE_BASE_URL
        ))
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
        return Err(format!(
            "fetchAvailableModels failed status {}: {}",
            status, text
        ));
    }

    serde_json::from_str(&text).map_err(|e| {
        error!(
            "JSON parse failed for fetchAvailableModels. Raw body: {}",
            text
        );
        format!(
            "Failed to parse models JSON: {} | Raw Body: {:.500}",
            e, text
        )
    })
}
