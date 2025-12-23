// Antigravity 用户数据清除模块
// 负责清除 Antigravity 应用的所有用户认证和设置信息

use rusqlite::{params, Connection};
use std::path::Path;

// 导入 platform_utils 模块
use crate::platform;

fn clear_database(db_path: &Path, db_name: &str) -> Result<usize, String> {
    tracing::info!(target: "cleanup::database", db_name = %db_name, "开始清理数据库");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 删除 jetskiStateSync.agentManagerInitState
    let key = "jetskiStateSync.agentManagerInitState";
    let rows = conn
        .execute("DELETE FROM ItemTable WHERE key = ?", [key])
        .unwrap_or(0);

    // 根据用户报告, 有些情况不删除 antigravityAuthStatus, Antigravity 不会生成新的
    let antigravity_auth_status_key = "antigravityAuthStatus";
    let antigravity_auth_status_rows = conn
        .execute("DELETE FROM ItemTable WHERE key = ?", [antigravity_auth_status_key])
        .unwrap_or(0);

    // 把 antigravityOnboarding 设置为布尔值 true（写为字符串 "true"） 以跳过首次启动引导
    let onboarding_key = "antigravityOnboarding";
    let onboarding_rows = conn
        .execute(
            "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
            params![onboarding_key, "true"],
        )
        .unwrap_or(0);

    if rows > 0 {
        tracing::debug!(target: "cleanup::database", key = %key, "已删除字段");
    }

    Ok(rows + onboarding_rows + antigravity_auth_status_rows)
}

pub async fn clear_all_antigravity_data() -> Result<String, String> {
    tracing::info!(target: "cleanup::main", "开始清除 Antigravity 用户认证数据（保留设备指纹）");

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

    if !app_data.exists() {
        return Err(format!(
            "Antigravity 状态数据库不存在: {}",
            app_data.display()
        ));
    }

    let mut msg = String::new();

    // 清理主库
    tracing::info!(target: "cleanup::main", "步骤1: 清除 state.vscdb 数据库");
    match clear_database(&app_data, "state.vscdb") {
        Ok(c) => {
            tracing::info!(target: "cleanup::main", cleaned_count = %c, "主数据库已清除");
            msg.push_str(&format!("主库清理 {} 项", c));
        }
        Err(e) => return Err(e),
    }

    // 删除备份库
    tracing::info!(target: "cleanup::main", "步骤2: 删除 state.vscdb.backup（如存在）");
    let backup_db = app_data.with_extension("vscdb.backup");
    if backup_db.exists() {
        match std::fs::remove_file(&backup_db) {
            Ok(_) => {
                tracing::info!(target: "cleanup::main", file = %backup_db.display(), "已删除备份数据库文件");
                msg.push_str("; 备份库文件已删除");
            }
            Err(e) => {
                tracing::warn!(target: "cleanup::main", file = %backup_db.display(), error = %e, "删除备份数据库文件失败")
            }
        }
    } else {
        tracing::debug!(target: "cleanup::main", "备份数据库不存在，跳过");
    }

    Ok(format!("✅ 登出成功: {}", msg))
}
