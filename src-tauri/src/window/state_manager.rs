// 窗口状态管理模块
// 负责保存和恢复应用程序窗口状态

use serde::{Deserialize, Serialize};
use std::fs;

use crate::config_manager::ConfigManager;

// 窗口状态结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 100.0,
            y: 100.0,
            width: 800.0,
            height: 600.0,
            maximized: false,
        }
    }
}

impl WindowState {
    /// 验证窗口状态是否有效
    ///
    /// 过滤以下无效状态：
    /// - 窗口位置超出合理范围（如 -32000，表示窗口被隐藏）
    /// - 窗口大小过小（宽度或高度 < 400）
    /// - 窗口大小过大（宽度 > 4000 或高度 > 3000）
    pub fn is_valid(&self) -> bool {
        // 检查位置是否在合理范围内（-1000 到 10000）
        let position_valid =
            self.x > -1000.0 && self.x < 10000.0 && self.y > -1000.0 && self.y < 10000.0;

        // 检查窗口大小是否合理（400x400 到 4000x3000）
        let size_valid = self.width >= 400.0
            && self.width <= 4000.0
            && self.height >= 400.0
            && self.height <= 3000.0;

        position_valid && size_valid
    }
}

/// 保存窗口状态
pub async fn save_window_state(state: WindowState) -> Result<(), String> {
    // 验证窗口状态是否有效，拒绝保存异常值
    if !state.is_valid() {
        println!(
            "⚠️ 检测到无效的窗口状态，跳过保存: 位置({:.1}, {:.1}), 大小({:.1}x{:.1})",
            state.x, state.y, state.width, state.height
        );
        return Ok(()); // 不返回错误，静默忽略
    }

    // 使用 ConfigManager 统一管理配置目录
    let config_manager = ConfigManager::new()?;
    let state_file = config_manager.window_state_file();

    let json_content =
        serde_json::to_string(&state).map_err(|e| format!("序列化窗口状态失败: {}", e))?;

    fs::write(state_file, json_content).map_err(|e| format!("保存窗口状态失败: {}", e))?;

    println!(
        "💾 窗口状态已保存: 位置({:.1}, {:.1}), 大小({:.1}x{:.1}), 最大化:{}",
        state.x, state.y, state.width, state.height, state.maximized
    );

    Ok(())
}

/// 加载窗口状态
pub async fn load_window_state() -> Result<WindowState, String> {
    // 使用 ConfigManager 统一管理配置目录
    let config_manager = ConfigManager::new()?;
    let state_file = config_manager.window_state_file();

    if state_file.exists() {
        let content =
            fs::read_to_string(&state_file).map_err(|e| format!("读取窗口状态文件失败: {}", e))?;

        let state: WindowState =
            serde_json::from_str(&content).map_err(|e| format!("解析窗口状态失败: {}", e))?;

        // 验证加载的状态是否有效
        if !state.is_valid() {
            println!(
                "⚠️ 加载的窗口状态无效（位置({:.1}, {:.1}), 大小({:.1}x{:.1})），使用默认状态",
                state.x, state.y, state.width, state.height
            );
            return Ok(WindowState::default());
        }

        Ok(state)
    } else {
        Ok(WindowState::default())
    }
}


