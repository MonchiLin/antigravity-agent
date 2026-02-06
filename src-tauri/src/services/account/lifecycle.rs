use super::storage::{
    backup_file_modified_time, list_backup_json_files, load_current_raw_account_fields,
    parse_backup_file, write_backup_file, RawAccountFields,
};
use super::types::{
    decode_oauth_token_to_struct, decode_user_status_to_struct, parse_auth_status_to_value,
    AntigravityAccountResponse, CommandResult,
};
use serde_json::json;
use std::path::Path;

fn parse_account_response(
    fields: &RawAccountFields,
    context: &str,
) -> Result<AntigravityAccountResponse, String> {
    let antigravity_auth_status = parse_auth_status_to_value(&fields.auth_status)
        .map_err(|e| format!("Failed to parse auth status for {context}: {e}"))?;

    let oauth_token = fields
        .oauth_token
        .as_deref()
        .map(decode_oauth_token_to_struct)
        .transpose()
        .map_err(|e| format!("Failed to decode oauth token for {context}: {e}"))?;

    let user_status = fields
        .user_status
        .as_deref()
        .map(decode_user_status_to_struct)
        .transpose()
        .map_err(|e| format!("Failed to decode user status for {context}: {e}"))?;

    Ok(AntigravityAccountResponse {
        antigravity_auth_status,
        oauth_token,
        user_status,
    })
}

fn tolerant_kill_antigravity_processes() -> Result<String, String> {
    match crate::platform::kill_antigravity_processes() {
        Ok(result) => Ok(result),
        Err(error) => {
            if error.contains("not found") || error.contains("未找到") {
                Ok("Antigravity process not running".to_string())
            } else {
                Err(format!("Failed to stop Antigravity process: {error}"))
            }
        }
    }
}

pub async fn get_all(config_dir: &Path) -> Result<Vec<AntigravityAccountResponse>, String> {
    tracing::debug!("Starting account list load");

    let mut accounts_with_modified_time = Vec::new();
    let files = list_backup_json_files(config_dir)?;

    for path in files {
        let context = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();
        let fields = parse_backup_file(&path)?;
        let account = parse_account_response(&fields, &context)?;
        accounts_with_modified_time.push((backup_file_modified_time(&path), account));
    }

    accounts_with_modified_time.sort_by(|a, b| b.0.cmp(&a.0));

    Ok(accounts_with_modified_time
        .into_iter()
        .map(|(_, account)| account)
        .collect())
}

pub async fn get_current() -> Result<AntigravityAccountResponse, String> {
    tracing::debug!("Loading current account from database");
    let fields = load_current_raw_account_fields()?;
    parse_account_response(&fields, "current database state")
}

pub async fn backup_current() -> Result<CommandResult, String> {
    tracing::info!("Backing up current Antigravity account");
    let fields = load_current_raw_account_fields()?;
    let auth_status = parse_auth_status_to_value(&fields.auth_status)?;

    let account_file_name = auth_status
        .get("email")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|email| !email.is_empty())
        .ok_or_else(|| "Email is missing in antigravityAuthStatus".to_string())?;

    let account_file = write_backup_file(account_file_name, &fields)?;
    let message = format!("Account backup saved to {}", account_file.display());

    Ok(
        CommandResult::success("backup_saved", message).with_details(json!({
            "account_name": account_file_name,
            "file_path": account_file.display().to_string()
        })),
    )
}

pub async fn clear_all_data() -> Result<CommandResult, String> {
    let message = crate::antigravity::cleanup::clear_all_antigravity_data()
        .await
        .map_err(|e| format!("Failed to clear Antigravity data: {e}"))?;

    Ok(
        CommandResult::success("clear_all_data_success", "Cleared Antigravity data")
            .with_details(json!({ "cleanup_message": message })),
    )
}

pub async fn restore(account_name: String) -> Result<CommandResult, String> {
    tracing::info!(account_name = %account_name, "Restoring account backup");
    let account_file =
        crate::directories::get_accounts_directory().join(format!("{account_name}.json"));

    let restore_message =
        crate::antigravity::restore::save_antigravity_account_to_file(account_file)
            .await
            .map_err(|e| format!("Failed to restore account '{account_name}': {e}"))?;

    Ok(CommandResult::success(
        "restore_success",
        format!("Restored account {account_name}"),
    )
    .with_details(json!({ "restore_message": restore_message, "account_name": account_name })))
}

pub async fn switch(account_name: String) -> Result<CommandResult, String> {
    tracing::info!(
        target: "account::switch",
        account_name = %account_name,
        "Switching account using fixed process mode (scenario 3)"
    );

    let kill_result = tolerant_kill_antigravity_processes()?;
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

    let clear_message = crate::antigravity::cleanup::clear_all_antigravity_data()
        .await
        .map_err(|e| format!("Failed to clear Antigravity data before switch: {e}"))?;

    let account_file =
        crate::directories::get_accounts_directory().join(format!("{account_name}.json"));
    let restore_message =
        crate::antigravity::restore::save_antigravity_account_to_file(account_file)
            .await
            .map_err(|e| format!("Failed to restore account '{account_name}': {e}"))?;

    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

    let start_message = crate::antigravity::starter::start_antigravity().map_err(|e| {
        format!("Account restored but failed to start Antigravity for '{account_name}': {e}")
    })?;

    Ok(CommandResult::success(
        "switch_success",
        format!("Account switched to {account_name}"),
    )
    .with_details(json!({
        "account_name": account_name,
        "kill_result": kill_result,
        "clear_message": clear_message,
        "restore_message": restore_message,
        "start_message": start_message
    })))
}

pub async fn sign_in_new() -> Result<CommandResult, String> {
    tracing::info!("Starting sign-in-new flow (backup + clear + restart)");
    let kill_result = tolerant_kill_antigravity_processes()?;

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    let backup_result = match backup_current().await {
        Ok(result) => Some(result),
        Err(error) => {
            tracing::warn!("Failed to backup current account during sign_in_new: {error}");
            None
        }
    };

    let clear_result = crate::antigravity::cleanup::clear_all_antigravity_data()
        .await
        .map_err(|error| format!("Failed to clear Antigravity data during sign_in_new: {error}"))?;

    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    let start_message = crate::antigravity::starter::start_antigravity()
        .map_err(|error| format!("Failed to start Antigravity during sign_in_new: {error}"))?;

    Ok(
        CommandResult::success("sign_in_new_completed", "Sign-in-new flow completed").with_details(
            json!({
                "kill_result": kill_result,
                "backup_result": backup_result,
                "clear_result": clear_result,
                "start_message": start_message
            }),
        ),
    )
}

pub fn is_running() -> bool {
    crate::platform::is_antigravity_running()
}
