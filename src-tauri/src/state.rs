use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileInfo {
    pub name: String,
    pub source_path: String,
    pub backup_path: String,
    pub created_at: String,
    pub last_updated: String,
}

// Antigravity 账户信息结构
#[derive(Debug, Serialize, Deserialize)]
pub struct AntigravityAccount {
    pub id: String,
    pub name: String,
    pub email: String,
    pub api_key: String,
    pub profile_url: String,   // Base64 编码的头像
    pub user_settings: String, // 编码后的用户设置
    pub created_at: String,
    pub last_switched: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub profiles: HashMap<String, ProfileInfo>,
    pub config_dir: PathBuf,
    pub antigravity_accounts: HashMap<String, AntigravityAccount>,
    pub current_account_id: Option<String>,
}

impl Default for AppState {
    fn default() -> Self {
        // 智能检测配置目录，确保跨平台兼容性
        let config_dir = if cfg!(windows) {
            // Windows: 优先使用 APPDATA 环境变量
            std::env::var_os("APPDATA")
                .map(|appdata| PathBuf::from(appdata).join(".antigravity-agent"))
                .or_else(|| {
                    // 备用方案：通过用户主目录构建 AppData\Roaming 路径
                    dirs::home_dir().map(|home| {
                        home.join("AppData")
                            .join("Roaming")
                            .join(".antigravity-agent")
                    })
                })
                .or_else(|| {
                    // 最后备用：使用系统标准配置目录
                    dirs::config_dir().map(|config| config.join(".antigravity-agent"))
                })
                .unwrap_or_else(|| PathBuf::from(".antigravity-agent"))
        } else {
            // macOS/Linux: 使用标准配置目录
            dirs::config_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".antigravity-agent")
        };

        // 确保配置目录存在
        fs::create_dir_all(&config_dir)
            .map_err(|e| eprintln!("警告：无法创建配置目录 {}: {}", config_dir.display(), e))
            .ok();

        Self {
            profiles: HashMap::new(),
            config_dir,
            antigravity_accounts: HashMap::new(),
            current_account_id: None,
        }
    }
}
