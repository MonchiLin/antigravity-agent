//! 账号操作模块
//!
//! 提供统一的账号操作核心函数，支持：
//! - 登录新账号（备份当前 + 清除 + 不恢复）
//! - 切换账号（不备份 + 清除 + 恢复目标）
//!
//! # 设计说明
//!
//! 本模块通过 `AccountOperationType` 枚举参数化不同的操作类型，
//! 实现了代码复用，消除了 `backup_and_restart_antigravity` 和
//! `switch_to_antigravity_account` 之间的重复逻辑。
//!
//! # 使用示例
//!
//! ```rust
//! // 登录新账号
//! let result = unified_account_operation(
//!     AccountOperationType::LoginNew,
//!     None
//! ).await?;
//!
//! // 切换账号
//! let result = unified_account_operation(
//!     AccountOperationType::Switch,
//!     Some("user@example.com".to_string())
//! ).await?;
//! ```

use rusqlite::Connection;

/// 账号操作类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AccountOperationType {
    /// 登录新账号（备份当前 + 清除 + 不恢复）
    LoginNew,
    /// 切换账号（不备份 + 清除 + 恢复目标）
    Switch,
}

/// 账号操作结果
#[derive(Debug)]
pub struct AccountOperationResult {
    pub kill_result: String,
    pub backup_info: Option<(String, String)>,  // (backup_name, action)
    pub restore_result: Option<String>,
    pub start_result: String,
}

/// 步骤1: 关闭 Antigravity 进程并等待
async fn kill_and_wait() -> Result<String, String> {
    tracing::info!(target: "account_ops::kill", "开始关闭 Antigravity 进程");

    let kill_result = match crate::platform::kill_antigravity_processes() {
        Ok(result) => {
            if result.contains("not found") || result.contains("未找到") {
                tracing::debug!(target: "account_ops::kill", "进程未运行，跳过关闭");
                "Antigravity 进程未运行".to_string()
            } else {
                tracing::debug!(target: "account_ops::kill", result = %result, "进程关闭完成");
                result
            }
        }
        Err(e) => {
            if e.contains("not found") || e.contains("未找到") {
                tracing::debug!(target: "account_ops::kill", "进程未运行，跳过关闭");
                "Antigravity 进程未运行".to_string()
            } else {
                tracing::error!(target: "account_ops::kill", error = %e, "关闭失败");
                return Err(format!("关闭进程时发生错误: {}", e));
            }
        }
    };

    // 等待1秒确保进程完全关闭
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

    Ok(kill_result)
}

/// 步骤2: 备份当前账号（如果已登录）
async fn backup_current_account_if_exists() -> Option<(String, String)> {
    tracing::info!(target: "account_ops::backup", "尝试备份当前账户");

    let app_data = crate::platform::get_antigravity_db_path()?;
    let conn = Connection::open(&app_data).ok()?;

    // 获取认证信息
    let auth_str: String = conn
        .query_row(
            "SELECT value FROM ItemTable WHERE key = 'antigravityAuthStatus'",
            [],
            |row| row.get(0),
        )
        .ok()?;

    drop(conn);

    // 解析邮箱
    let auth_data: serde_json::Value = serde_json::from_str(&auth_str).ok()?;
    let email = auth_data.get("email")?.as_str()?;

    tracing::debug!(target: "account_ops::backup", email = %email, "获取到邮箱");

    // 执行备份
    match crate::antigravity::backup::smart_backup_antigravity_account(email) {
        Ok((backup_name, is_overwrite)) => {
            let action = if is_overwrite { "更新" } else { "创建" };
            tracing::info!(target: "account_ops::backup", action = %action, name = %backup_name, "备份完成");
            Some((backup_name, action.to_string()))
        }
        Err(e) => {
            tracing::warn!(target: "account_ops::backup", error = %e, "备份失败");
            None
        }
    }
}

/// 步骤3: 清除所有 Antigravity 数据并等待
async fn clear_data_and_wait() -> Result<String, String> {
    tracing::info!(target: "account_ops::clear", "开始清除 Antigravity 数据");

    let clear_result = crate::antigravity::cleanup::clear_all_antigravity_data().await?;

    tracing::debug!(target: "account_ops::clear", result = %clear_result, "清除完成");

    // 等待500ms确保清除完成
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    Ok(clear_result)
}

/// 步骤4: 恢复指定账号数据并等待
async fn restore_and_wait(account_name: String) -> Result<String, String> {
    tracing::info!(target: "account_ops::restore", account = %account_name, "开始恢复账号数据");

    // 构建备份文件路径
    let config_dir = dirs::config_dir()
        .ok_or("无法获取配置目录")?
        .join(".antigravity-agent")
        .join("antigravity-accounts");
    let backup_file = config_dir.join(format!("{}.json", account_name));

    // 调用恢复函数
    let restore_result = crate::antigravity::restore::restore_all_antigravity_data(backup_file).await?;

    tracing::debug!(target: "account_ops::restore", result = %restore_result, "恢复完成");

    // 等待1秒确保数据库写入完成
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

    Ok(restore_result)
}

/// 步骤5: 启动 Antigravity 进程
fn start_antigravity_process() -> Result<String, String> {
    tracing::info!(target: "account_ops::start", "开始启动 Antigravity 进程");

    match crate::antigravity::starter::start_antigravity() {
        Ok(result) => {
            tracing::info!(target: "account_ops::start", result = %result, "启动成功");
            Ok(result)
        }
        Err(e) => {
            tracing::warn!(target: "account_ops::start", error = %e, "启动失败");
            Ok(format!("启动失败: {}", e))  // 不阻断流程
        }
    }
}

/// 统一的账号操作核心函数
///
/// # 参数
/// - `operation_type`: 操作类型（LoginNew 或 Switch）
/// - `target_account`: 目标账号（仅 Switch 模式需要）
///
/// # 返回
/// - `Ok(AccountOperationResult)`: 操作成功，返回各步骤结果
/// - `Err(String)`: 操作失败，返回错误信息
pub async fn unified_account_operation(
    operation_type: AccountOperationType,
    target_account: Option<String>,
) -> Result<AccountOperationResult, String> {
    tracing::info!(
        target: "account_ops::unified",
        op_type = ?operation_type,
        target = ?target_account,
        "开始执行账号操作"
    );

    // 步骤1: 关闭进程
    let kill_result = kill_and_wait().await?;

    // 步骤2: 备份当前账户（如果已登录）
    // LoginNew 和 Switch 都会执行备份，确保数据不丢失
    let backup_info = backup_current_account_if_exists().await;

    // 步骤3: 清除数据
    let _clear_result = clear_data_and_wait().await?;

    // 步骤4: 恢复（仅 Switch 模式）
    let restore_result = if operation_type == AccountOperationType::Switch {
        if let Some(account) = target_account {
            Some(restore_and_wait(account).await?)
        } else {
            return Err("Switch 模式必须提供目标账号".to_string());
        }
    } else {
        None
    };

    // 步骤5: 启动进程
    let start_result = start_antigravity_process()?;

    tracing::info!(target: "account_ops::unified", "账号操作完成");

    Ok(AccountOperationResult {
        kill_result,
        backup_info,
        restore_result,
        start_result,
    })
}

/// 格式化登录新账号的结果消息
pub fn format_login_new_result(result: AccountOperationResult) -> String {
    if let Some((backup_name, action)) = result.backup_info {
        format!(
            "{} -> 已{}备份: {} -> 已清除账户数据 -> {}",
            result.kill_result, action, backup_name, result.start_result
        )
    } else {
        format!(
            "{} -> 未检测到登录用户（跳过备份） -> 已清除账户数据 -> {}",
            result.kill_result, result.start_result
        )
    }
}

/// 格式化切换账号的结果消息
pub fn format_switch_result(result: AccountOperationResult) -> String {
    let restore_msg = result.restore_result.unwrap_or_else(|| "未恢复".to_string());

    // 如果有备份信息，显示在消息中
    if let Some((backup_name, action)) = result.backup_info {
        format!(
            "{} -> 已{}备份: {} -> {} -> {}",
            result.kill_result, action, backup_name, restore_msg, result.start_result
        )
    } else {
        format!(
            "{} -> 未检测到当前登录用户（跳过备份） -> {} -> {}",
            result.kill_result, restore_msg, result.start_result
        )
    }
}
