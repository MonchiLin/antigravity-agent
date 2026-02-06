// Antigravity 用户数据恢复模块
// 负责将备份数据恢复到 Antigravity 应用数据库

use rusqlite::{params, Connection};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

// 导入相关模块
use crate::constants::database;
use crate::platform;

/// 恢复 Antigravity 状态（精简版）
///
/// 从账户文件恢复 antigravityAuthStatus / oauthToken / userStatus
///
/// # 参数
/// - `account_file_path`: 账户 JSON 文件的完整路径
///
/// # 返回
/// - `Ok(message)`: 成功消息
/// - `Err(message)`: 错误信息
pub async fn save_antigravity_account_to_file(
    account_file_path: PathBuf,
) -> Result<String, String> {
    let content = fs::read_to_string(&account_file_path).map_err(|e| e.to_string())?;
    let account_data: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let app_data = platform::get_antigravity_db_path().unwrap();

    // 确保数据库目录存在
    if let Some(parent) = app_data.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建数据库目录失败: {}", e))?;
    }

    let mut msg = String::new();

    // 内联恢复逻辑：写回 AUTH_STATUS / OAUTH_TOKEN / USER_STATUS
    let restore_db = |db_path: &PathBuf, db_name: &str| -> Result<usize, String> {
        tracing::info!(target: "restore::database", db_name = %db_name, "开始恢复数据库");
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

        let mut restored_count = 0;

        if let Some(val) = account_data.get(database::AUTH_STATUS) {
            if let Some(val_str) = val.as_str() {
                match conn.execute(
                    "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
                    params![database::AUTH_STATUS, val_str],
                ) {
                    Ok(_) => {
                        tracing::debug!(target: "restore::database", key = %database::AUTH_STATUS, "注入认证状态成功");
                        restored_count += 1;
                    }
                    Err(e) => {
                        tracing::error!(target: "restore::database", key = %database::AUTH_STATUS, error = %e, "写入认证状态失败");
                    }
                }
            }
        } else {
            if let Err(e) = conn.execute(
                "DELETE FROM ItemTable WHERE key = ?",
                [database::AUTH_STATUS],
            ) {
                tracing::warn!(target: "restore::database", error = %e, "删除 antigravityAuthStatus 失败（忽略）");
            } else {
                tracing::debug!(target: "restore::database", "旧备份无认证状态，已清理旧数据");
            }
        }

        // [NEW] 恢复 OAuth Token
        if let Some(val) = account_data.get(database::OAUTH_TOKEN) {
            if let Some(val_str) = val.as_str() {
                match conn.execute(
                    "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
                    params![database::OAUTH_TOKEN, val_str],
                ) {
                    Ok(_) => {
                        tracing::debug!(target: "restore::database", key = %database::OAUTH_TOKEN, "注入 OAuth Token成功");
                        restored_count += 1;
                    }
                    Err(e) => {
                        tracing::error!(target: "restore::database", key = %database::OAUTH_TOKEN, error = %e, "写入 OAuth Token 失败");
                    }
                }
            }
        }

        // [NEW] 恢复 User Status
        if let Some(val) = account_data.get(database::USER_STATUS) {
            if let Some(val_str) = val.as_str() {
                match conn.execute(
                    "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
                    params![database::USER_STATUS, val_str],
                ) {
                    Ok(_) => {
                        tracing::debug!(target: "restore::database", key = %database::USER_STATUS, "注入 User Status 成功");
                        restored_count += 1;
                    }
                    Err(e) => {
                        tracing::error!(target: "restore::database", key = %database::USER_STATUS, error = %e, "写入 User Status 失败");
                    }
                }
            }
        }

        Ok(restored_count)
    };

    // 恢复主库
    println!("📊 步骤1: 恢复 state.vscdb 数据库");
    match restore_db(&app_data, "state.vscdb") {
        Ok(count) => {
            let status = format!("主库恢复 {} 项", count);
            println!("  ✅ {}", status);
            msg.push_str(&status);
        }
        Err(e) => return Err(e),
    }

    // 恢复账户库（如果有）
    println!("💾 步骤2: 恢复 state.vscdb.backup");
    let backup_db = app_data.with_extension("vscdb.backup");
    if backup_db.exists() {
        if let Ok(count) = restore_db(&backup_db, "state.vscdb.backup") {
            let status = format!("; 账户库恢复 {} 项", count);
            println!("  ✅ {}", status);
            msg.push_str(&status);
        }
    } else {
        println!("  ℹ️ 账户数据库不存在，跳过");
    }

    Ok(format!("✅ 恢复成功! {}", msg))
}
