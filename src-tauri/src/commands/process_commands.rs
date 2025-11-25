//! 进程管理命令
//! 负责 Antigravity 进程的启动、关闭、重启等操作
use rusqlite::Connection;
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
    println!("🔄 开始执行 backup_and_restart_antigravity 命令");

    // 1. 关闭进程 (如果存在)
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

    // 等待500ms确保进程完全关闭（缩短等待时间避免前端超时）
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // 2. 备份当前账户信息（使用统一的智能备份函数）
    println!("💾 步骤2: 尝试备份当前账户信息");


    let backup_info = {
        // 获取邮箱
        if let Some(app_data) = crate::platform::get_antigravity_db_path() {
            // 尝试打开数据库
            match Connection::open(&app_data) {
                Ok(conn) => {
                    // 尝试获取认证信息
                    let auth_result: rusqlite::Result<String> = conn.query_row(
                        "SELECT value FROM ItemTable WHERE key = 'antigravityAuthStatus'",
                        [],
                        |row| row.get(0),
                    );

                    drop(conn);

                    match auth_result {
                        Ok(auth_str) => {
                            // 解析并提取邮箱
                            match serde_json::from_str::<serde_json::Value>(&auth_str) {
                                Ok(auth_data) => {
                                    if let Some(email) = auth_data.get("email").and_then(|v| v.as_str()) {
                                        println!("📧 获取到的邮箱: {}", email);
                                        
                                        // 尝试备份
                                        match crate::antigravity::backup::smart_backup_antigravity_account(email) {
                                            Ok((backup_name, is_overwrite)) => {
                                                let backup_action = if is_overwrite { "更新" } else { "创建" };
                                                println!("✅ 备份完成 ({}): {}", backup_action, backup_name);
                                                Some((backup_name, backup_action))
                                            }
                                            Err(e) => {
                                                println!("⚠️ 备份失败: {}", e);
                                                None
                                            }
                                        }
                                    } else {
                                        println!("ℹ️ 认证信息中未找到邮箱，跳过备份");
                                        None
                                    }
                                }
                                Err(e) => {
                                    println!("ℹ️ 解析认证信息失败: {}，跳过备份", e);
                                    None
                                }
                            }
                        }
                        Err(_) => {
                            println!("ℹ️ 未找到认证信息（可能未登录），跳过备份");
                            None
                        }
                    }
                }
                Err(e) => {
                    println!("⚠️ 连接数据库失败: {}，跳过备份", e);
                    None
                }
            }
        } else {
            println!("⚠️ 未找到 Antigravity 数据库路径，跳过备份");
            None
        }
    };

    // 3. 清除 Antigravity 所有数据 (彻底注销)
    println!("🗑️ 步骤3: 清除所有 Antigravity 数据 (彻底注销)");
    match crate::antigravity::cleanup::clear_all_antigravity_data().await {
        Ok(result) => {
            println!("✅ 清除完成: {}", result);
        }
        Err(e) => {
            // 清除失败可能是因为数据库本来就是空的，这是正常情况
            println!("ℹ️ 清除数据时出现: {}（可能数据库本来就是空的）", e);
        }
    }

    // 等待300ms确保操作完成（缩短等待时间避免前端超时）
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

    // 4. 重新启动进程
    println!("🚀 步骤4: 重新启动 Antigravity");
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

    let final_message = if let Some((backup_name, backup_action)) = backup_info {
        format!(
            "{} -> 已{}备份: {} -> 已清除账户数据 -> {}",
            kill_result, backup_action, backup_name, start_message
        )
    } else {
        format!(
            "{} -> 未检测到登录用户（跳过备份） -> 已清除账户数据 -> {}",
            kill_result, start_message
        )
    };
    println!("🎉 所有操作完成: {}", final_message);

    Ok(final_message)
}

// 命令函数将在后续步骤中移动到这里
