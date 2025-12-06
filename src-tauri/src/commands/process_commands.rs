//! 进程管理命令
//! 负责 Antigravity 进程的启动、关闭、重启等操作
/// 关闭 Antigravity 进程
#[tauri::command]
pub async fn kill_antigravity() -> Result<String, String> {
    crate::platform::kill_antigravity_processes()
}

/// 启动 Antigravity 应用
#[tauri::command]
pub async fn start_antigravity() -> Result<String, String> {
    crate::antigravity::starter::start_antigravity()
}

/// 检查 Antigravity 进程是否正在运行
#[tauri::command]
pub async fn is_antigravity_running() -> bool {
    crate::platform::is_antigravity_running()
}

/// 列出所有 Antigravity 相关的进程（用于调试）
#[tauri::command]
pub async fn list_antigravity_processes() -> Result<Vec<serde_json::Value>, String> {
    use serde_json::json;

  tracing::info!("🔍 搜索所有 Antigravity 相关进程");

    let mut system = sysinfo::System::new_all();
    system.refresh_all();

    let mut found_processes = Vec::new();
    let process_patterns = crate::platform::get_antigravity_process_patterns_for_debug();

    for (pid, process) in system.processes() {
        let process_name = process.name();
        let process_cmd = process.cmd().join(" ");

        for (i, pattern) in process_patterns.iter().enumerate() {
            if crate::platform::matches_antigravity_process_for_debug(
                process_name, &process_cmd, pattern
            ) {
                found_processes.push(json!({
                    "pid": pid.to_string(),
                    "name": process_name,
                    "command": process_cmd,
                    "matched_pattern": i,
                    "pattern_description": format!("{:?}", pattern)
                }));
                break; // 每个进程只记录一次
            }
        }
    }

  tracing::info!("📊 找到 {} 个 Antigravity 相关进程", found_processes.len());
    Ok(found_processes)
}

/// 备份并重启 Antigravity
#[tauri::command]
pub async fn backup_and_restart_antigravity() -> Result<String, String> {
    use crate::antigravity::account_operations::{
        unified_account_operation,
        AccountOperationType,
        format_login_new_result,
    };

    let result = unified_account_operation(
        AccountOperationType::LoginNew,
        None
    ).await?;

    Ok(format_login_new_result(result))
}

// 命令函数将在后续步骤中移动到这里
