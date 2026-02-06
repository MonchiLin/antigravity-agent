use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Clone)]
pub struct RawAccountFields {
    pub auth_status: String,
    pub oauth_token: Option<String>,
    pub user_status: Option<String>,
}

pub fn resolve_antigravity_db_path() -> Result<PathBuf, String> {
    crate::platform::get_antigravity_db_path()
        .ok_or_else(|| "Antigravity database path not found".to_string())
}

pub fn open_antigravity_connection() -> Result<(Connection, PathBuf), String> {
    let db_path = resolve_antigravity_db_path()?;
    let conn = Connection::open(&db_path).map_err(|e| {
        format!(
            "Failed to open SQLite database ({}): {e}",
            db_path.display()
        )
    })?;
    Ok((conn, db_path))
}

pub fn query_item_value(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row("SELECT value FROM ItemTable WHERE key = ?", [key], |row| {
        row.get(0)
    })
    .optional()
    .map_err(|e| format!("Failed to query key '{key}' from ItemTable: {e}"))
}

pub fn load_current_raw_account_fields() -> Result<RawAccountFields, String> {
    let (conn, _db_path) = open_antigravity_connection()?;

    let auth_status = query_item_value(&conn, crate::constants::database::AUTH_STATUS)?
        .ok_or_else(|| "antigravityAuthStatus not found in database".to_string())?;
    let oauth_token = query_item_value(&conn, crate::constants::database::OAUTH_TOKEN)?;
    let user_status = query_item_value(&conn, crate::constants::database::USER_STATUS)?;

    Ok(RawAccountFields {
        auth_status,
        oauth_token,
        user_status,
    })
}

pub fn list_backup_json_files(config_dir: &Path) -> Result<Vec<PathBuf>, String> {
    let antigravity_dir = config_dir.join("antigravity-accounts");
    let entries = fs::read_dir(&antigravity_dir).map_err(|e| {
        format!(
            "Failed to read backup directory ({}): {e}",
            antigravity_dir.display()
        )
    })?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {e}"))?;
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            files.push(path);
        }
    }
    Ok(files)
}

pub fn parse_backup_file(path: &Path) -> Result<RawAccountFields, String> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown");

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read backup file '{file_name}': {e}"))?;
    let backup_data: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse backup file '{file_name}' as JSON: {e}"))?;

    let auth_status = backup_data
        .get(crate::constants::database::AUTH_STATUS)
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Backup file '{file_name}' is missing antigravityAuthStatus"))?
        .to_string();

    let oauth_token = backup_data
        .get(crate::constants::database::OAUTH_TOKEN)
        .and_then(|v| v.as_str())
        .map(ToString::to_string);

    let user_status = backup_data
        .get(crate::constants::database::USER_STATUS)
        .and_then(|v| v.as_str())
        .map(ToString::to_string);

    Ok(RawAccountFields {
        auth_status,
        oauth_token,
        user_status,
    })
}

pub fn backup_file_modified_time(path: &Path) -> SystemTime {
    fs::metadata(path)
        .and_then(|meta| meta.modified())
        .unwrap_or(SystemTime::UNIX_EPOCH)
}

pub fn write_backup_file(
    account_file_name: &str,
    fields: &RawAccountFields,
) -> Result<PathBuf, String> {
    let accounts_dir = crate::directories::get_accounts_directory();
    let account_file = accounts_dir.join(format!("{account_file_name}.json"));

    let mut content_map = serde_json::Map::new();
    content_map.insert(
        crate::constants::database::AUTH_STATUS.to_string(),
        serde_json::Value::String(fields.auth_status.clone()),
    );

    if let Some(token) = &fields.oauth_token {
        content_map.insert(
            crate::constants::database::OAUTH_TOKEN.to_string(),
            serde_json::Value::String(token.clone()),
        );
    }

    if let Some(status) = &fields.user_status {
        content_map.insert(
            crate::constants::database::USER_STATUS.to_string(),
            serde_json::Value::String(status.clone()),
        );
    }

    let content = serde_json::Value::Object(content_map);
    let serialized = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize account backup JSON: {e}"))?;

    fs::write(&account_file, serialized).map_err(|e| {
        format!(
            "Failed to write account backup file ({}): {e}",
            account_file.display()
        )
    })?;

    Ok(account_file)
}
