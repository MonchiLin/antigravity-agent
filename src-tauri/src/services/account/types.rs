use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntigravityAccountResponse {
    pub antigravity_auth_status: Value,
    pub oauth_token: Option<OAuthTokenDecoded>,
    pub user_status: Option<UserStatusDecoded>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthTokenDecoded {
    pub sentinel_key: String,
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expiry_seconds: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserStatusDecoded {
    pub sentinel_key: String,
    pub raw_data_type: String,
    pub raw_data: Value,
}

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TriggerResult {
    pub email: String,
    pub triggered_models: Vec<String>,
    pub failed_models: Vec<String>,
    pub skipped_models: Vec<String>,
    pub skipped_details: Vec<String>,
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandResult {
    pub ok: bool,
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl CommandResult {
    pub fn success(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            ok: true,
            code: code.into(),
            message: message.into(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: Value) -> Self {
        self.details = Some(details);
        self
    }
}

pub fn normalize_json_keys_to_snake_case(value: Value) -> Value {
    match value {
        Value::Object(map) => Value::Object(normalize_object_keys(map)),
        Value::Array(items) => Value::Array(
            items
                .into_iter()
                .map(normalize_json_keys_to_snake_case)
                .collect(),
        ),
        other => other,
    }
}

pub fn parse_auth_status_to_value(raw: &str) -> Result<Value, String> {
    let auth_status: Value = serde_json::from_str(raw)
        .map_err(|e| format!("Failed to parse antigravityAuthStatus: {e}"))?;
    Ok(normalize_json_keys_to_snake_case(auth_status))
}

pub fn decode_oauth_token_to_struct(raw: &str) -> Result<OAuthTokenDecoded, String> {
    let decoded = crate::utils::codec::decode_oauth_token(raw)
        .map_err(|e| format!("Failed to decode oauth token: {e}"))?;
    let normalized = normalize_json_keys_to_snake_case(decoded);
    serde_json::from_value(normalized)
        .map_err(|e| format!("Failed to parse oauth token payload: {e}"))
}

pub fn decode_user_status_to_struct(raw: &str) -> Result<UserStatusDecoded, String> {
    let decoded = crate::utils::codec::decode_user_status(raw)
        .map_err(|e| format!("Failed to decode user status: {e}"))?;
    let normalized = normalize_json_keys_to_snake_case(decoded);
    serde_json::from_value(normalized)
        .map_err(|e| format!("Failed to parse user status payload: {e}"))
}

fn normalize_object_keys(map: Map<String, Value>) -> Map<String, Value> {
    map.into_iter()
        .map(|(key, value)| {
            (
                to_snake_case(&key),
                normalize_json_keys_to_snake_case(value),
            )
        })
        .collect()
}

fn to_snake_case(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut out = String::with_capacity(input.len() + 8);

    for (i, ch) in chars.iter().enumerate() {
        if *ch == '-' || *ch == ' ' {
            out.push('_');
            continue;
        }

        if ch.is_ascii_uppercase() {
            if i > 0 {
                let prev = chars[i - 1];
                let next = chars.get(i + 1).copied();
                let should_insert_underscore = prev.is_ascii_lowercase()
                    || prev.is_ascii_digit()
                    || next.map(|n| n.is_ascii_lowercase()).unwrap_or(false);
                if should_insert_underscore && !out.ends_with('_') {
                    out.push('_');
                }
            }
            out.push(ch.to_ascii_lowercase());
        } else {
            out.push(*ch);
        }
    }

    out
}
