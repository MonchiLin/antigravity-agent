pub mod account_commands;
/// 命令模块统一导出
/// 按功能分组管理所有 Tauri 命令
// 账户管理命令
pub mod account_manage_commands;

// 进程管理命令
pub mod process_commands;

// 平台支持命令
pub mod platform_commands;

// 窗口状态命令
pub mod window_commands;

// 系统托盘命令
pub mod tray_commands;

// 日志相关命令
pub mod logging_commands;

// 应用设置命令
pub mod settings_commands;

// 数据库监控命令
pub mod db_monitor_commands;

// 账户指标命令
pub mod account_metrics_commands;
// 语言服务器相关命令（在 src/language_server 下）

// 重新导出所有命令，保持与 main.rs 的兼容性
pub use account_commands::*;
pub use account_manage_commands::*;
pub use db_monitor_commands::*;
pub use account_metrics_commands::*;
pub use logging_commands::*;
pub use platform_commands::*;
pub use process_commands::*;
pub use settings_commands::*;
pub use tray_commands::*;
