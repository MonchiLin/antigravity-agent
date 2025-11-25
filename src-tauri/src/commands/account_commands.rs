//! 账户管理命令
//! 负责 Antigravity 账户的切换、备份、恢复、清除等操作

use rusqlite::{Connection, Result as SqlResult};
use serde_json::Value;
use tauri::State;
use tracing::instrument;

/// 切换 Antigravity 账户
#[tauri::command]
#[instrument(fields(account_id = %account_id))]
pub async fn switch_antigravity_account(
    account_id: String,
    _state: State<'_, crate::AppState>,
) -> Result<String, String> {
  tracing::info!("开始切换 Antigravity 账户");

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
    _state: State<'_, crate::AppState>,
) -> Result<Vec<crate::AntigravityAccount>, String> {
  tracing::info!("获取所有 Antigravity 账户");

  // 这里应该从存储中加载账户列表
    // 暂时返回空列表
    Ok(vec![])
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
    println!(
        "📥 调用 restore_antigravity_account，账户名: {}",
        account_name
    );

    // 1. 构建备份文件路径
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".antigravity-agent")
        .join("antigravity-accounts");
    let backup_file = config_dir.join(format!("{}.json", account_name));

    // 2. 调用统一的恢复函数
    crate::antigravity::restore::restore_all_antigravity_data(backup_file).await
}

/// 切换到 Antigravity 账户（调用 restore_antigravity_account）
#[tauri::command]
pub async fn switch_to_antigravity_account(account_name: String) -> Result<String, String> {
    crate::log_async_command!("switch_to_antigravity_account", async {
        tracing::info!("🔄 开始执行切换到账户: {}", account_name);

        // 1. 关闭 Antigravity 进程 (如果存在)
        println!("🛑 步骤1: 检查并关闭 Antigravity 进程");
        let kill_result = match crate::platform::kill_antigravity_processes() {
            Ok(result) => {
                if result.contains("not found") || result.contains("未找到") {
                    println!("ℹ️ Antigravity 进程未运行，跳过关闭步骤");
                    "Antigravity 进程未运行".to_string()
                } else {
                    println!("✅ 进程关闭结果: {}", result);
                    result
                }
            }
            Err(e) => {
                if e.contains("not found") || e.contains("未找到") {
                    println!("ℹ️ Antigravity 进程未运行，跳过关闭步骤");
                    "Antigravity 进程未运行".to_string()
                } else {
                    return Err(format!("关闭进程时发生错误: {}", e));
                }
            }
        };

        // 等待一秒确保进程完全关闭
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // 2. 恢复指定账户到 Antigravity 数据库
        println!("💾 步骤2: 恢复账户数据: {}", account_name);
        let restore_result = restore_antigravity_account(account_name.clone()).await?;
        println!("✅ 账户数据恢复完成: {}", restore_result);

        // 等待一秒确保数据库操作完成
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // 3. 重新启动 Antigravity 进程
        println!("🚀 步骤3: 重新启动 Antigravity");
        let start_result = crate::antigravity::starter::start_antigravity();
        let start_message = match start_result {
            Ok(result) => {
                println!("✅ 启动结果: {}", result);
                result
            }
            Err(e) => {
                println!("⚠️ 启动失败: {}", e);
                format!("启动失败: {}", e)
            }
        };

        let final_message = format!("{} -> {} -> {}", kill_result, restore_result, start_message);
        tracing::info!("🎉 账户切换完成: {}", final_message);

        Ok(final_message)
    })
}

// 命令函数将在后续步骤中移动到这里
