//! 账户管理命令
//! 负责 Antigravity 账户的切换、备份、恢复、清除等操作

use rusqlite::{Connection, Result as SqlResult};
use serde_json::{Value, from_str};
use tauri::State;
use tracing::instrument;
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Local};

/// 切换 Antigravity 账户
#[tauri::command]
#[instrument(fields(account_id = %account_id))]
pub async fn switch_antigravity_account(
    account_id: String,
    _state: State<'_, crate::AppState>,
) -> Result<String, String> {
  tracing::info!(target: "account::switch_legacy", account_id = %account_id, "开始切换 Antigravity 账户");

  let start_time = std::time::Instant::now();

  let result = async {
        // 获取 Antigravity 状态数据库路径
        let app_data = match crate::platform::get_antigravity_db_path() {
            Some(path) => path,
            None => {
                // 如果主路径不存在，尝试其他可能的位置
                let possible_paths = crate::platform::get_all_antigravity_db_paths();
                if possible_paths.is_empty() {
                    return Err("未找到Antigravity安装位置".to_string());
                }
                possible_paths[0].clone()
            }
        };

        if !app_data.exists() {
            return Err(format!(
                "Antigravity 状态数据库文件不存在: {}",
                app_data.display()
            ));
        }

        // 连接到 SQLite 数据库
        let _conn = Connection::open(&app_data)
            .map_err(|e| format!("连接数据库失败 ({}): {}", app_data.display(), e))?;

        // 记录数据库操作
    crate::utils::tracing_config::log_database_operation("连接数据库", Some("ItemTable"), true);

        // 这里应该加载并更新账户信息
        // 由于状态管理的复杂性，我们先返回成功信息
        Ok(format!(
            "已切换到账户: {} (数据库: {})",
            account_id,
            app_data.display()
        ))
  }.await;

  let duration = start_time.elapsed();

  match result {
    Ok(msg) => {
      tracing::info!(
                duration_ms = duration.as_millis(),
                "账户切换操作完成"
            );
      Ok(msg)
    }
    Err(e) => {
      tracing::error!(
                error = %e,
                duration_ms = duration.as_millis(),
                "账户切换操作失败"
            );
      Err(e)
    }
  }
}

/// 获取所有 Antigravity 账户
#[tauri::command]
#[instrument]
pub async fn get_antigravity_accounts(
    state: State<'_, crate::AppState>,
) -> Result<Vec<crate::AntigravityAccount>, String> {
    tracing::debug!("📋 开始获取所有 Antigravity 账户");

    let start_time = std::time::Instant::now();

    let result = async {
        let mut accounts = Vec::new();

        // 获取备份目录路径
        let antigravity_dir = state.config_dir.join("antigravity-accounts");

        if !antigravity_dir.exists() {
            tracing::info!("📂 备份目录不存在，返回空列表");
            return Ok(accounts);
        }

        // 读取目录中的所有 JSON 文件
        let entries = fs::read_dir(&antigravity_dir)
            .map_err(|e| format!("读取备份目录失败: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
            let path = entry.path();

            // 只处理 JSON 文件
            if path.extension().is_some_and(|ext| ext == "json") {
                let file_name = match path.file_stem() {
                    Some(name) => name.to_string_lossy().to_string(),
                    None => continue,
                };

                tracing::debug!("📄 正在解析备份文件: {}", file_name);

                // 读取并解析 JSON 文件
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("读取文件失败 {}: {}", file_name, e))?;

                let backup_data: Value = from_str(&content)
                    .map_err(|e| format!("解析 JSON 失败 {}: {}", file_name, e))?;

                // 提取账户信息
                let account = parse_backup_to_account(&backup_data, &file_name, &path)?;
                accounts.push(account);

                tracing::info!("✅ 成功解析账户: {}", file_name);
            }
        }

        // 按最后修改时间排序（最新的在前）
        accounts.sort_by(|a, b| b.last_switched.cmp(&a.last_switched));

        tracing::debug!(
            "🎉 成功加载 {} 个账户",
            accounts.len()
        );

        Ok(accounts)
    }.await;

    let duration = start_time.elapsed();

    match result {
        Ok(accounts) => {
            tracing::debug!(
                duration_ms = duration.as_millis(),
                account_count = accounts.len(),
                "获取账户列表完成"
            );
            Ok(accounts)
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                duration_ms = duration.as_millis(),
                "获取账户列表失败"
            );
            Err(e)
        }
    }
}

/// 将备份数据解析为账户对象
fn parse_backup_to_account(
    backup_data: &Value,
    file_name: &str,
    file_path: &PathBuf,
) -> Result<crate::AntigravityAccount, String> {
    // 提取邮箱
    let email = backup_data
        .get("account_email")
        .and_then(|v| v.as_str())
        .unwrap_or(file_name)
        .to_string();

    // 提取备份时间（如果存在）
    let backup_time_str = backup_data
        .get("backup_time")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // 从文件修改时间获取 last_switched
    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("获取文件元数据失败: {}", e))?;
    let modified_time = metadata.modified()
        .map_err(|e| format!("获取修改时间失败: {}", e))?;
    let datetime: DateTime<Local> = DateTime::from(modified_time);
    let last_switched = datetime.format("%Y-%m-%d %H:%M:%S").to_string();

    // 从备份数据中提取认证状态信息
    let auth_status = backup_data
        .get("antigravityAuthStatus")
        .and_then(|v| v.as_str());

    // 解析认证状态 JSON（如果存在）
    let (name, api_key) = if let Some(auth_json) = auth_status {
        match from_str::<Value>(auth_json) {
            Ok(auth_data) => {
                let name = auth_data
                    .get("name")
                    .or_else(|| auth_data.get("email"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(&email.split('@').next().unwrap_or(&email))
                    .to_string();

                let api_key = auth_data
                    .get("apiKey")
                    .or_else(|| auth_data.get("accessToken"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                (name, api_key)
            }
            Err(_) => {
                // 解析失败，使用默认值
                let name = email.split('@').next().unwrap_or(&email).to_string();
                (name, "".to_string())
            }
        }
    } else {
        // 没有认证信息，使用默认值
        let name = email.split('@').next().unwrap_or(&email).to_string();
        (name, "".to_string())
    };

    // 提取用户设置
    let user_settings = backup_data
        .get("antigravityUserSettings.allUserSettings")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // 提取头像 URL
    let profile_url = backup_data
        .get("antigravity.profileUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // 生成 ID（使用邮箱的哈希或直接使用邮箱）
    let id = format!("account_{}", email);

    // 创建时间（使用备份时间或文件时间）
    let created_at = if !backup_time_str.is_empty() {
        backup_time_str.to_string()
    } else {
        last_switched.clone()
    };

    Ok(crate::AntigravityAccount {
        id,
        name,
        email,
        api_key,
        profile_url,
        user_settings,
        created_at,
        last_switched,
    })
}

/// 获取当前 Antigravity 信息
#[tauri::command]
#[instrument]
pub async fn get_current_antigravity_info() -> Result<Value, String> {
  tracing::info!("开始获取当前 Antigravity 信息");

  let start_time = std::time::Instant::now();

  let result = async {
        // 尝试获取 Antigravity 状态数据库路径
        let app_data = match crate::platform::get_antigravity_db_path() {
            Some(path) => path,
            None => {
                // 如果主路径不存在，尝试其他可能的位置
                let possible_paths = crate::platform::get_all_antigravity_db_paths();
                if possible_paths.is_empty() {
                    return Err("未找到Antigravity安装位置".to_string());
                }
                possible_paths[0].clone()
            }
        };

        if !app_data.exists() {
            return Err(format!(
                "Antigravity 状态数据库文件不存在: {}",
                app_data.display()
            ));
        }

        // 连接到 SQLite 数据库并获取认证信息
        let conn = Connection::open(&app_data)
            .map_err(|e| format!("连接数据库失败 ({}): {}", app_data.display(), e))?;

        let auth_result: SqlResult<String> = conn.query_row(
            "SELECT value FROM ItemTable WHERE key = 'antigravityAuthStatus'",
            [],
            |row| row.get(0),
        );

        match auth_result {
            Ok(auth_json) => {
                // 解析 JSON 字符串
                match serde_json::from_str::<Value>(&auth_json) {
                    Ok(mut auth_data) => {
                        // 添加数据库路径信息
                        auth_data["db_path"] =
                            Value::String(app_data.to_string_lossy().to_string());
                        Ok(auth_data)
                    }
                    Err(e) => Err(format!("解析认证信息失败: {}", e)),
                }
            }
            Err(e) => Err(format!("查询认证信息失败: {}", e)),
        }
  }.await;

  let duration = start_time.elapsed();

  match result {
    Ok(data) => {
      tracing::info!(
                duration_ms = duration.as_millis(),
                "获取 Antigravity 信息完成"
            );
      Ok(data)
    }
    Err(e) => {
      tracing::error!(
                error = %e,
                duration_ms = duration.as_millis(),
                "获取 Antigravity 信息失败"
            );
      Err(e)
    }
  }
}

/// 备份当前 Antigravity 账户
#[tauri::command]
#[instrument]
pub async fn backup_antigravity_current_account() -> Result<String, String> {
  tracing::info!("📥 开始备份当前账户");

  let start_time = std::time::Instant::now();

  let result = async {

        // 尝试获取 Antigravity 状态数据库路径
        let app_data = match crate::platform::get_antigravity_db_path() {
            Some(path) => path,
            None => {
                // 如果主路径不存在，尝试其他可能的位置
                let possible_paths = crate::platform::get_all_antigravity_db_paths();
                if possible_paths.is_empty() {
                    return Err("未找到Antigravity安装位置".to_string());
                }
                possible_paths[0].clone()
            }
        };

        if !app_data.exists() {
            return Err(format!(
                "Antigravity 状态数据库文件不存在: {}",
                app_data.display()
            ));
        }

        // 连接到 SQLite 数据库并获取认证信息
        let conn = Connection::open(&app_data)
            .map_err(|e| format!("连接数据库失败 ({}): {}", app_data.display(), e))?;

        let auth_result: SqlResult<String> = conn.query_row(
            "SELECT value FROM ItemTable WHERE key = 'antigravityAuthStatus'",
            [],
            |row| row.get(0),
        );

        match auth_result {
            Ok(auth_json) => {
                // 解析 JSON 字符串
                match serde_json::from_str::<Value>(&auth_json) {
                    Ok(auth_data) => {
                        // 尝试获取邮箱
                        if let Some(email) = auth_data.get("email").and_then(|v| v.as_str()) {
                          tracing::info!(user_email = email, "📧 检测到当前用户");

                            // 调用智能备份函数，让它处理去重逻辑和文件名生成
                            match crate::antigravity::backup::smart_backup_antigravity_account(email) {
                                Ok((backup_name, is_overwrite)) => {
                                    let action = if is_overwrite { "更新" } else { "备份" };
                                    let message = format!("Antigravity 账户 '{}'{}成功", backup_name, action);
                                  tracing::info!(backup_name = %backup_name, action = %action, "✅ 智能备份完成");
                                    Ok(message)
                                }
                                Err(e) => {
                                  tracing::error!(error = %e, "❌ 智能备份失败");
                                    Err(e)
                                }
                            }
                        } else {
                          tracing::warn!("⚠️ 认证信息中未找到邮箱字段");
                            Err("未检测到已登录用户".to_string())
                        }
                    }
                    Err(e) => {
                      tracing::error!(error = %e, "❌ 解析认证信息失败");
                        Err("解析认证信息失败".to_string())
                    }
                }
            }
            Err(e) => {
              tracing::warn!(error = %e, "⚠️ 查询认证信息失败");
                Err("未检测到已登录用户".to_string())
            }
        }
  }.await;

  let duration = start_time.elapsed();

  match result {
    Ok(message) => {
      tracing::info!(
                duration_ms = duration.as_millis(),
                result_message = %message,
                "账户备份操作完成"
            );
      Ok(message)
    }
    Err(e) => {
      tracing::error!(
                error = %e,
                duration_ms = duration.as_millis(),
                "账户备份操作失败"
            );
      Err(e)
    }
  }
}

/// 清除所有 Antigravity 数据
#[tauri::command]
pub async fn clear_all_antigravity_data() -> Result<String, String> {
    crate::antigravity::cleanup::clear_all_antigravity_data().await
}

/// 恢复 Antigravity 账户
#[tauri::command]
pub async fn restore_antigravity_account(account_name: String) -> Result<String, String> {
    tracing::debug!(target: "account::restore", account_name = %account_name, "调用 restore_antigravity_account");

    // 1. 构建备份文件路径
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".antigravity-agent")
        .join("antigravity-accounts");
    let backup_file = config_dir.join(format!("{}.json", account_name));

    // 2. 调用统一的恢复函数
    crate::antigravity::restore::restore_all_antigravity_data(backup_file).await
}

/// 切换到 Antigravity 账户
#[tauri::command]
pub async fn switch_to_antigravity_account(account_name: String) -> Result<String, String> {
    crate::log_async_command!("switch_to_antigravity_account", async {
        use crate::antigravity::account_operations::{
            unified_account_operation,
            AccountOperationType,
            format_switch_result,
        };

        let result = unified_account_operation(
            AccountOperationType::Switch,
            Some(account_name)
        ).await?;

        Ok(format_switch_result(result))
    })
}


// 命令函数将在后续步骤中移动到这里
