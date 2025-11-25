// Antigravity 用户数据恢复模块
// 负责将备份数据恢复到 Antigravity 应用数据库

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;

// 导入相关模块
use crate::constants::database;
use crate::platform;

/// 从备份的 Marker 中获取 Key 对应的 flag (0 或 1)
/// 如果找不到，回退到安全默认值
fn get_marker_flag_from_backup(backup_marker: &Option<&Value>, key: &str) -> i32 {
    if let Some(marker_val) = backup_marker {
        if let Some(marker_obj) = marker_val.as_object() {
            if let Some(flag) = marker_obj.get(key) {
                if let Some(i) = flag.as_i64() {
                    println!("  📖 从备份 Marker 读取 {} = {}", key, i);
                    return i as i32;
                }
            }
        }
    }

    // 只有在备份文件损坏或是旧版本时才使用此回退逻辑
    let default = match key {
        database::AUTH_STATUS
        | database::PROFILE_URL
        | database::ONBOARDING
        | database::COMMAND_CONFIGS => 0,
        _ => 1,
    };
    println!(
        "  ⚠️ 备份中没有 {} 的 Marker 信息，使用默认值: {}",
        key, default
    );
    default
}

/// 通用数据库恢复方法（终极版 - 从备份 Marker 读取值）
///
/// 执行精确的数据库恢复操作：
/// 1. 从备份中读取字段的原始值
/// 2. 插入到数据库（使用 INSERT OR REPLACE）
/// 3. 从备份的 Marker 中读取每个字段应该是 0 还是 1
/// 4. 智能合并 Marker（保留现有配置）
///
/// # 参数
/// - `db_path`: 数据库文件路径
/// - `db_name`: 数据库名称（用于日志显示）
/// - `backup_data`: 备份数据的 JSON 对象
///
/// # 返回
/// - `Ok(restored_count)`: 成功恢复的项目数量
/// - `Err(message)`: 错误信息
fn restore_database(
    db_path: &PathBuf,
    db_name: &str,
    backup_data: &Value,
) -> Result<usize, String> {
    println!("🔄 恢复数据库: {}", db_name);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 使用常量定义需要恢复的字段列表（与备份列表一致）
    let keys_to_restore = database::ALL_KEYS;

    let mut restored_count = 0;
    let mut restored_keys = Vec::new();

    // 1. 插入数据（Value 直接使用备份中的原始字符串）
    for key in keys_to_restore {
        if let Some(val) = backup_data.get(*key) {
            if let Some(val_str) = val.as_str() {
                match conn.execute(
                    "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
                    params![key, val_str],
                ) {
                    Ok(_) => {
                        println!("  ✅ 注入数据: {}", key);
                        restored_count += 1;
                        // 只有非特殊字段才需要在 Marker 中注册
                        if key != &database::NEW_STORAGE_MARKER {
                            restored_keys.push(key);
                        }
                    }
                    Err(e) => {
                        println!("  ⚠️ 写入 {} 失败: {}", key, e);
                    }
                }
            } else {
                println!("  ⚠️ 字段 {} 不是字符串类型，跳过", key);
            }
        } else {
            println!("  ℹ️ 备份中未找到: {} (跳过)", key);
        }
    }

    // 2. 恢复通知字段（避免历史通知重复弹窗）
    if let Some(notification_keys_value) = backup_data.get("notification_keys") {
        if let Some(notification_keys) = notification_keys_value.as_array() {
            if !notification_keys.is_empty() {
                println!("  📬 开始恢复 {} 个通知字段...", notification_keys.len());
                let mut notification_count = 0;

                for notification_key_value in notification_keys {
                    if let Some(notification_key) = notification_key_value.as_str() {
                        // 查找对应的通知数据
                        if let Some(notification_data) = backup_data.get(notification_key) {
                            if let Some(notification_str) = notification_data.as_str() {
                                match conn.execute(
                                    "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
                                    params![notification_key, notification_str],
                                ) {
                                    Ok(_) => {
                                        println!("  ✅ 恢复通知: {}", notification_key);
                                        notification_count += 1;
                                        // 通知字段不添加到 restored_keys 中，因为它们通常不需要参与 Marker 同步
                                    }
                                    Err(e) => {
                                        println!("  ⚠️ 恢复通知失败 {}: {}", notification_key, e);
                                    }
                                }
                            }
                        }
                    }
                }

                println!("  ✅ 成功恢复 {} 个通知字段", notification_count);
            }
        }
    }

    // 3. 智能合并 Marker
    if !restored_keys.is_empty() {
        println!("  🔧 开始智能合并 Marker...");

        // A. 读取当前数据库的 Marker
        let current_marker_str: Option<String> = conn
            .query_row(
                &format!(
                    "SELECT value FROM ItemTable WHERE key = '{}'",
                    database::TARGET_STORAGE_MARKER
                ),
                [],
                |row| row.get(0),
            )
            .optional()
            .unwrap_or(None);

        let mut current_marker_obj = match current_marker_str {
            Some(s) => {
                println!("  📋 读取到现有 Marker");
                serde_json::from_str::<serde_json::Map<String, Value>>(&s).unwrap_or_default()
            }
            None => {
                println!("  ℹ️ 未找到现有 Marker，创建新的");
                serde_json::Map::new()
            }
        };

        println!(
            "  📊 合并前 Marker 包含 {} 个字段",
            current_marker_obj.len()
        );

        // B. 获取备份文件中的 Marker（作为参考源）
        let backup_marker = backup_data.get("__$__targetStorageMarker");
        if backup_marker.is_some() {
            println!("  📖 从备份文件中读取到完整 Marker，将使用其中的值作为参考");
        } else {
            println!("  ⚠️ 备份文件中没有 Marker，将使用默认值");
        }

        // C. 将已恢复 Key 的 Marker 状态合并进去
        for key in &restored_keys {
            // 关键：从备份里读取它是 0 还是 1，而不是瞎猜
            let flag = get_marker_flag_from_backup(&backup_marker, key);
            current_marker_obj.insert(key.to_string(), json!(flag));
        }

        println!(
            "  📊 合并后 Marker 包含 {} 个字段",
            current_marker_obj.len()
        );

        // D. 写回 Marker
        let new_marker_str = serde_json::to_string(&current_marker_obj)
            .map_err(|e| format!("序列化 Marker 失败: {}", e))?;

        conn.execute(
            &format!(
                "INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('{}', ?)",
                database::TARGET_STORAGE_MARKER
            ),
            [new_marker_str],
        )
        .map_err(|e| format!("更新 Marker 失败: {}", e))?;

        println!("  ✅ Marker 已智能合并（使用备份中的精确值）");

        // E. 重置上传时间戳（防止 Sync 冲突）
        let _ = conn.execute(
            "INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('antigravityAnalytics.lastUploadTime', '0')",
            []
        );
        println!("  ✅ 已重置分析时间戳");
    } else {
        println!("  ⚠️ 未恢复任何数据，跳过 Marker 更新");
    }

    Ok(restored_count)
}

/// 恢复 Antigravity 的用户认证数据（终极版）
///
/// 从备份文件恢复用户数据到数据库：
/// - 恢复所有字段的原始值
/// - 从备份的 Marker 中读取每个字段的同步状态（0 或 1）
/// - 恢复 __$__isNewStorageMarker 状态标记
/// - 同时处理主数据库和备份数据库
///
/// # 参数
/// - `backup_file_path`: 备份 JSON 文件的完整路径
///
/// # 返回
/// - `Ok(message)`: 成功消息
/// - `Err(message)`: 错误信息
pub async fn restore_all_antigravity_data(backup_file_path: PathBuf) -> Result<String, String> {
    println!("🚀 开始执行智能恢复（从备份 Marker 读取精确值）...");
    println!("📂 备份文件: {}", backup_file_path.display());

    if !backup_file_path.exists() {
        return Err(format!("备份文件不存在: {}", backup_file_path.display()));
    }

    let content = fs::read_to_string(&backup_file_path).map_err(|e| e.to_string())?;
    let backup_data: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    println!("✅ 备份文件读取成功");

    let app_data = match platform::get_antigravity_db_path() {
        Some(p) => p,
        None => {
            let possible_paths = platform::get_all_antigravity_db_paths();
            if possible_paths.is_empty() {
                return Err("未找到 Antigravity 安装位置".to_string());
            }
            possible_paths[0].clone()
        }
    };

    // 确保数据库目录存在
    if let Some(parent) = app_data.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建数据库目录失败: {}", e))?;
    }

    let mut msg = String::new();

    // 恢复主库
    println!("📊 步骤1: 恢复 state.vscdb 数据库");
    match restore_database(&app_data, "state.vscdb", &backup_data) {
        Ok(count) => {
            let status = format!("主库恢复 {} 项", count);
            println!("  ✅ {}", status);
            msg.push_str(&status);
        }
        Err(e) => return Err(e),
    }

    // 恢复备份库（如果有）
    println!("💾 步骤2: 恢复 state.vscdb.backup");
    let backup_db = app_data.with_extension("vscdb.backup");
    if backup_db.exists() {
        if let Ok(count) = restore_database(&backup_db, "state.vscdb.backup", &backup_data) {
            let status = format!("; 备份库恢复 {} 项", count);
            println!("  ✅ {}", status);
            msg.push_str(&status);
        }
    } else {
        println!("  ℹ️ 备份数据库不存在，跳过");
    }

    Ok(format!("✅ 恢复成功! {}", msg))
}
