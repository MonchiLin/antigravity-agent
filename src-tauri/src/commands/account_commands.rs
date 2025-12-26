//! 账户基础命令：查询、备份、恢复、切换、清理

use crate::antigravity::account::decode_jetski_state_proto;
use base64::Engine;
use prost::Message;
use rusqlite::{Connection, OptionalExtension};
use serde_json::{from_str, Value};
use std::fs;
use tauri::State;
use tracing::instrument;

/// 获取所有 Antigravity 账户（解码 jetskiStateSync.agentManagerInitState，返回完整 SessionResponse JSON）
#[tauri::command]
#[instrument]
/// 获取所有 Antigravity 账户（核心逻辑）
pub async fn get_antigravity_accounts_logic(config_dir: &std::path::Path) -> Result<Vec<Value>, String> {
    tracing::debug!("📋 开始获取所有 Antigravity 账户 (Logic)");
    let start_time = std::time::Instant::now();

    let result = async {
        let mut accounts: Vec<(std::time::SystemTime, Value)> = Vec::new();
        let antigravity_dir = config_dir.join("antigravity-accounts");

        if !antigravity_dir.exists() {
            tracing::info!("📂 备份目录不存在，返回空列表");
            return Ok(Vec::new());
        }

        let entries = fs::read_dir(&antigravity_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
            let path = entry.path();

            if path.extension().is_some_and(|ext| ext == "json") {
                let file_name = match path.file_stem() {
                    Some(name) => name.to_string_lossy().to_string(),
                    None => continue,
                };

                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("读取文件失败 {}: {}", file_name, e))?;

                let backup_data: Value = from_str(&content)
                    .map_err(|e| format!("解析 JSON 失败 {}: {}", file_name, e))?;

                let jetski_state = backup_data
                    .get("jetskiStateSync.agentManagerInitState")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| format!("备份文件 {} 缺少 jetskiStateSync.agentManagerInitState", file_name))?;

                // 这里假设 decode_jetski_state_proto 是可见的或者 crate::antigravity::account::decode_jetski_state_proto
                let decoded = crate::antigravity::account::decode_jetski_state_proto(jetski_state)?;

                let modified_time = fs::metadata(&path)
                    .and_then(|m| m.modified())
                    .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

                accounts.push((modified_time, decoded));
            }
        }

        accounts.sort_by(|a, b| b.0.cmp(&a.0));
        let decoded_only: Vec<Value> = accounts.into_iter().map(|(_, decoded)| decoded).collect();
        Ok(decoded_only)
    }.await;

    let duration = start_time.elapsed();
    match result {
        Ok(accounts) => {
            tracing::debug!(duration_ms = duration.as_millis(), account_count = accounts.len(), "获取账户列表完成");
            Ok(accounts)
        }
        Err(e) => {
            tracing::error!(error = %e, duration_ms = duration.as_millis(), "获取账户列表失败");
            Err(e)
        }
    }
}

/// 获取所有 Antigravity 账户（Tauri Command）
#[tauri::command]
#[instrument]
pub async fn get_antigravity_accounts(
    state: State<'_, crate::AppState>,
) -> Result<Vec<Value>, String> {
    get_antigravity_accounts_logic(&state.config_dir).await
}

/// 获取当前 Antigravity 账户信息
#[tauri::command]
#[instrument]
pub async fn get_current_antigravity_account_info() -> Result<Value, String> {
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

        // jetski 状态（可选）
        let jetski_state: Option<String> = conn
            .query_row(
                "SELECT value FROM ItemTable WHERE key = 'jetskiStateSync.agentManagerInitState'",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("查询 jetskiStateSync.agentManagerInitState 失败: {}", e))?;

        let state_str = jetski_state
            .ok_or_else(|| "未找到 jetskiStateSync.agentManagerInitState".to_string())?;

        // 解码 jetski 状态（base64 + proto）；失败直接报错
        let decoded = decode_jetski_state_proto(&state_str)?;

        Ok(serde_json::json!(decoded))
    }
    .await;

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
pub async fn save_antigravity_current_account() -> Result<String, String> {
    tracing::info!("📥 开始保存 jetskiStateSync.agentManagerInitState");

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

        // jetski 状态（必需）
        let jetski_state: String = conn
            .query_row(
                "SELECT value FROM ItemTable WHERE key = 'jetskiStateSync.agentManagerInitState'",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("查询 jetskiStateSync.agentManagerInitState 失败: {}", e))?
            .ok_or_else(|| "未找到 jetskiStateSync.agentManagerInitState".to_string())?;

        // 从 jetski proto 解码邮箱（仅用于文件名）
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(jetski_state.trim())
            .map_err(|e| format!("jetskiStateSync Base64 解码失败: {}", e))?;
        let msg = crate::proto::SessionResponse::decode(bytes.as_slice())
            .map_err(|e| format!("jetskiStateSync Protobuf 解码失败: {}", e))?;

        let email = msg
            .context
            .as_ref()
            .and_then(|c| {
                if c.email.is_empty() {
                    None
                } else {
                    Some(c.email.as_str())
                }
            })
            .ok_or_else(|| "jetskiStateSync 中未找到邮箱字段，无法确定备份文件名".to_string())?;

        // 直接保存原始字符串，不解码，文件名与原逻辑保持：{email}.json
        let accounts_dir = crate::directories::get_accounts_directory();
        if let Err(e) = std::fs::create_dir_all(&accounts_dir) {
            return Err(format!("创建账户目录失败: {}", e));
        }

        let account_file = accounts_dir.join(format!("{email}.json"));
        let content = serde_json::json!({
            "jetskiStateSync.agentManagerInitState": jetski_state
        });
        std::fs::write(
            &account_file,
            serde_json::to_string_pretty(&content).unwrap(),
        )
        .map_err(|e| format!("写入 jetski 状态失败: {}", e))?;

        let message = format!(
            "已保存 jetskiStateSync.agentManagerInitState 到 {}",
            account_file.display()
        );
        tracing::info!(file = %account_file.display(), "✅ 保存 jetski 状态完成");
        Ok(message)
    }
    .await;

    let duration = start_time.elapsed();

    match result {
        Ok(message) => {
            tracing::info!(
                duration_ms = duration.as_millis(),
                result_message = %message,
                "账户保存操作完成"
            );
            Ok(message)
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                duration_ms = duration.as_millis(),
                "账户保存操作失败"
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
    let accounts_dir = crate::directories::get_accounts_directory();
    let account_file = accounts_dir.join(format!("{account_name}.json"));

    // 2. 调用统一的恢复函数
    crate::antigravity::restore::save_antigravity_account_to_file(account_file).await
}

/// 切换到 Antigravity 账户（调用 restore_antigravity_account）
#[tauri::command]
pub async fn switch_to_antigravity_account(account_name: String) -> Result<String, String> {
    crate::log_async_command!("switch_to_antigravity_account", async {
        // 1. 关闭 Antigravity 进程 (如果存在)
        let kill_result = match crate::platform::kill_antigravity_processes() {
            Ok(result) => {
                if result.contains("not found") || result.contains("未找到") {
                    tracing::debug!(target: "account::switch::step1", "Antigravity 进程未运行，跳过关闭步骤");
                    "Antigravity 进程未运行".to_string()
                } else {
                    tracing::debug!(target: "account::switch::step1", result = %result, "进程关闭完成");
                    result
                }
            }
            Err(e) => {
                if e.contains("not found") || e.contains("未找到") {
                    tracing::debug!(target: "account::switch::step1", "Antigravity 进程未运行，跳过关闭步骤");
                    "Antigravity 进程未运行".to_string()
                } else {
                    tracing::error!(target: "account::switch::step1", error = %e, "关闭进程时发生错误");
                    return Err(format!("关闭进程时发生错误: {}", e));
                }
            }
        };

        // 等待一秒确保进程完全关闭
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // 2. 清除原来的数据库
        clear_all_antigravity_data().await?;
        tracing::warn!(target: "account::switch::step2", "Antigravity 数据库清除完成");

        // 3. 恢复指定账户到 Antigravity 数据库
        let restore_result = restore_antigravity_account(account_name.clone()).await?;
        tracing::debug!(target: "account::switch::step3", result = %restore_result, "账户数据恢复完成");

        // 等待一秒确保数据库操作完成
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // 4. 重新启动 Antigravity 进程
        let start_result = crate::antigravity::starter::start_antigravity();
        let start_message = match start_result {
            Ok(result) => {
                tracing::debug!(target: "account::switch::step4", result = %result, "Antigravity 启动成功");
                result
            }
            Err(e) => {
                tracing::warn!(target: "account::switch::step4", error = %e, "Antigravity 启动失败");
                format!("启动失败: {}", e)
            }
        };

        let final_message = format!("{} -> {} -> {}", kill_result, restore_result, start_message);

        Ok(final_message)
    })
}
