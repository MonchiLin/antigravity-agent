use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

/// 应用程序设置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    /// 是否启用系统托盘
    pub system_tray_enabled: bool,
    /// 是否启用静默启动（启动时最小化到托盘或后台）
    pub silent_start_enabled: bool,
    /// Debug 模式：记录 debug 级别日志（写入文件）
    pub debug_mode: bool,
    /// 隐私模式：用户信息打码（邮箱/用户名）
    pub private_mode: bool,
    /// 语言偏好设置
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_language() -> String {
    "en".to_string()
}

fn default_private_mode() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            system_tray_enabled: false,
            silent_start_enabled: false,
            debug_mode: false,
            private_mode: default_private_mode(),
            language: default_language(),
        }
    }
}

pub fn load_settings_from_disk(config_path: &PathBuf) -> AppSettings {
    if config_path.exists() {
        match fs::read_to_string(config_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => AppSettings::default(),
        }
    } else {
        AppSettings::default()
    }
}

impl AppSettings {
    /// 验证设置的有效性，确保不会出现危险的配置组合
    pub fn validate(&mut self) -> bool {
        let mut changed = false;

        // 如果启用了静默启动但未启用系统托盘，这是危险的配置
        // 自动禁用静默启动以确保安全
        if self.silent_start_enabled && !self.system_tray_enabled {
            tracing::warn!(
                target: "app_settings::validate",
                "检测到危险的配置组合：静默启动已启用但系统托盘未启用。自动禁用静默启动以确保安全。"
            );
            self.silent_start_enabled = false;
            changed = true;
        }

        changed
    }
}

/// 应用程序设置管理器
pub struct AppSettingsManager {
    settings: Mutex<AppSettings>,
    config_path: PathBuf,
}

impl AppSettingsManager {
    /// 创建新的设置管理器
    pub fn new(_app_handle: &AppHandle) -> Self {
        // 使用统一的配置目录
        let config_path = crate::directories::get_app_settings_file();

        // 尝试加载现有设置
        let mut settings = load_settings_from_disk(&config_path);

        // 验证并修正已存在的设置
        if settings.validate() {
            tracing::warn!(
                target: "app_settings::init",
                "加载的设置包含危险配置，已自动修正"
            );
        }

        Self {
            settings: Mutex::new(settings),
            config_path,
        }
    }

    /// 获取当前设置的副本
    pub fn get_settings(&self) -> AppSettings {
        self.settings.lock().unwrap().clone()
    }

    /// 更新设置
    pub fn update_settings<F>(&self, update_fn: F) -> Result<(), String>
    where
        F: FnOnce(&mut AppSettings),
    {
        let mut settings = self.settings.lock().unwrap();

        // 记录更新前的状态用于日志
        let old_silent_start = settings.silent_start_enabled;
        let old_system_tray = settings.system_tray_enabled;

        update_fn(&mut settings);

        // 验证设置的有效性，如果返回 true 表示有修改
        if settings.validate() {
            tracing::info!(
                target: "app_settings::update",
                old_silent_start = old_silent_start,
                old_system_tray = old_system_tray,
                new_silent_start = settings.silent_start_enabled,
                new_system_tray = settings.system_tray_enabled,
                "设置验证后已自动修正"
            );
        }

        // 保存到文件
        let json = serde_json::to_string_pretty(&*settings)
            .map_err(|e| format!("序列化设置失败: {}", e))?;

        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }

        fs::write(&self.config_path, json).map_err(|e| format!("写入设置文件失败: {}", e))?;

        Ok(())
    }
}
