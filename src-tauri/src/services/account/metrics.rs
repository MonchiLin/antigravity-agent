use super::types::{AccountMetrics, QuotaItem, TriggerResult};
use serde_json::Value;

struct ModelTarget {
    key: &'static str,
    display_name: &'static str,
}

const MODEL_TARGETS: [ModelTarget; 4] = [
    ModelTarget {
        key: "gemini-3-pro-high",
        display_name: "Gemini Pro",
    },
    ModelTarget {
        key: "gemini-3-flash",
        display_name: "Gemini Flash",
    },
    ModelTarget {
        key: "gemini-3-pro-image",
        display_name: "Gemini Image",
    },
    ModelTarget {
        key: "claude-opus-4-5-thinking",
        display_name: "Claude",
    },
];

#[derive(Debug, Clone)]
struct ParsedQuota {
    model_key: &'static str,
    item: QuotaItem,
}

async fn ensure_valid_token_with_refresh(
    email: &str,
    access_token: &str,
    refresh_token: Option<&str>,
) -> Result<(crate::services::google_api::ValidToken, String), String> {
    use crate::services::google_api;

    match google_api::get_valid_token(email, access_token).await {
        Ok(info) => Ok((info, access_token.to_string())),
        Err(error) => {
            let is_unauthorized = error.contains("401") || error.contains("Unauthorized");
            if !is_unauthorized {
                return Err(error);
            }

            let refresh_token = refresh_token.ok_or_else(|| {
                format!("Token expired (401) and no refresh token is available: {error}")
            })?;

            let new_access_token = google_api::refresh_access_token(refresh_token)
                .await
                .map_err(|refresh_error| {
                    format!("Token expired and refresh failed: {refresh_error}")
                })?;

            let token_info = google_api::get_valid_token(email, &new_access_token)
                .await
                .map_err(|retry_error| {
                    format!("Token refresh succeeded but validation retry failed: {retry_error}")
                })?;

            Ok((token_info, new_access_token))
        }
    }
}

pub async fn get_metrics(
    config_dir: &std::path::Path,
    email: String,
) -> Result<AccountMetrics, String> {
    use crate::services::google_api;

    let (email, access_token, refresh_token) = google_api::load_account(config_dir, &email).await?;
    let (token_info, valid_access_token) =
        ensure_valid_token_with_refresh(&email, &access_token, refresh_token.as_deref()).await?;

    let project = google_api::fetch_code_assist_project(&valid_access_token)
        .await
        .map_err(|e| format!("Failed to fetch project id: {e}"))?;

    let models_json = google_api::fetch_available_models(&valid_access_token, &project)
        .await
        .map_err(|e| format!("Failed to fetch models: {e}"))?;

    let quotas = parse_quotas_for_targets(&models_json)
        .into_iter()
        .map(|quota| quota.item)
        .collect();

    Ok(AccountMetrics {
        email,
        user_id: token_info.user_id,
        avatar_url: token_info.avatar_url,
        quotas,
    })
}

pub async fn trigger_quota_refresh(
    config_dir: &std::path::Path,
    email: String,
) -> Result<TriggerResult, String> {
    use crate::services::google_api;
    use tracing::error;

    tracing::info!(email = %email, "Checking quotas and triggering refresh when needed");

    let (email, access_token, refresh_token) = google_api::load_account(config_dir, &email).await?;
    let (token_info, valid_access_token) =
        ensure_valid_token_with_refresh(&email, &access_token, refresh_token.as_deref())
            .await
            .map_err(|e| format!("Authentication failed: {e}"))?;

    let project = match google_api::fetch_code_assist_project(&valid_access_token).await {
        Ok(project_id) => project_id,
        Err(error) => {
            return Ok(TriggerResult {
                email,
                triggered_models: Vec::new(),
                failed_models: Vec::new(),
                skipped_models: Vec::new(),
                skipped_details: vec![format!("Project id unavailable: {error}")],
                success: false,
                message: format!("Skipped: project id unavailable ({error})"),
            });
        }
    };

    let models_json = google_api::fetch_available_models(&valid_access_token, &project)
        .await
        .map_err(|e| format!("Failed to fetch models for refresh trigger: {e}"))?;
    let parsed_quotas = parse_quotas_for_targets(&models_json);

    let mut triggered_models = Vec::new();
    let mut failed_models = Vec::new();
    let mut skipped_models = Vec::new();
    let mut skipped_details = Vec::new();

    for quota in parsed_quotas {
        if quota.item.percentage > 0.9999 {
            match trigger_minimal_query(&token_info.access_token, &project, quota.model_key).await {
                Ok(()) => triggered_models.push(quota.item.model_name.clone()),
                Err(error) => {
                    error!(
                        model_name = %quota.item.model_name,
                        model_key = %quota.model_key,
                        error = %error,
                        "Quota refresh trigger failed"
                    );
                    failed_models.push(format!("{} ({})", quota.item.model_name, error));
                }
            }
        } else {
            skipped_models.push(quota.item.model_name.clone());
            skipped_details.push(format!(
                "{} ({:.4}%)",
                quota.item.model_name,
                quota.item.percentage * 100.0
            ));
        }
    }

    let success = failed_models.is_empty();
    let message = if !success {
        "Refresh trigger completed with failures".to_string()
    } else if triggered_models.is_empty() {
        "No model required refresh".to_string()
    } else {
        "Refresh trigger completed".to_string()
    };

    Ok(TriggerResult {
        email,
        triggered_models,
        failed_models,
        skipped_models,
        skipped_details,
        success,
        message,
    })
}

fn parse_quotas_for_targets(models_json: &Value) -> Vec<ParsedQuota> {
    let Some(models_map) = models_json.get("models").and_then(|v| v.as_object()) else {
        return Vec::new();
    };

    MODEL_TARGETS
        .iter()
        .filter_map(|target| {
            let model_data = models_map.get(target.key)?;
            let quota_info = model_data.get("quotaInfo")?;

            let percentage = quota_info
                .get("remainingFraction")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let reset_text = quota_info
                .get("resetTime")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            Some(ParsedQuota {
                model_key: target.key,
                item: QuotaItem {
                    model_name: target.display_name.to_string(),
                    percentage,
                    reset_text,
                },
            })
        })
        .collect()
}

async fn trigger_minimal_query(
    access_token: &str,
    project: &str,
    model_key: &str,
) -> Result<(), String> {
    use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let url = format!(
        "{}/v1internal:generateContent",
        crate::services::google_api::CLOUD_CODE_BASE_URL
    );

    let body = serde_json::json!({
        "project": project,
        "model": model_key,
        "request": {
            "contents": [
                {
                    "role": "user",
                    "parts": [{ "text": format!("Hi [Ref: {}]", chrono::Utc::now().to_rfc3339()) }]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 10
            }
        }
    });

    let response = client
        .post(&url)
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/json")
        .header(USER_AGENT, "antigravity/windows/amd64")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Refresh trigger HTTP request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Refresh trigger API returned status {}",
            response.status()
        ));
    }

    Ok(())
}
