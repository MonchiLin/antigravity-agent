//! 系统托盘管理模块
//!
//! 负责系统托盘的生命周期管理、菜单构建和事件处理。
//! 使用 AppSettingsManager 进行状态持久化。

pub mod events;
pub mod manager;
pub mod menu;

// Re-export the main struct for convenience
pub use manager::SystemTrayManager;
