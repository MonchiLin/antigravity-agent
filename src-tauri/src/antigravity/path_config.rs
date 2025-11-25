//! Antigravity 路径配置管理模块
//! 负责保存和读取用户自定义的 Antigravity 安装路径

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Antigravity 路径配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntigravityPathConfig {
    /// 用户自定义的 Antigravity 数据目录路径（state.vscdb 所在目录）
    pub custom_data_path: Option<String>,
    /// 用户自定义的 Antigravity 可执行文件路径
    pub custom_executable_path: Option<String>,
}

impl Default for AntigravityPathConfig {
    fn default() -> Self {
        Self { 
            custom_data_path: None,
            custom_executable_path: None,
        }
    }
}

/// 获取配置文件路径
fn get_config_file_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("无法获取配置目录")?
        .join(".antigravity-agent");

    // 确保配置目录存在
    fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;

    Ok(config_dir.join("antigravity_path.json"))
}

/// 保存用户自定义数据目录路径
pub fn save_custom_data_path(path: String) -> Result<(), String> {
    let config_file = get_config_file_path()?;
    let mut config = read_config().unwrap_or_default();
    
    config.custom_data_path = Some(path);
    write_config(&config_file, &config)?;

  tracing::info!("✅ 已保存自定义 Antigravity 数据路径");
    Ok(())
}

/// 保存用户自定义可执行文件路径
pub fn save_custom_executable_path(path: String) -> Result<(), String> {
    let config_file = get_config_file_path()?;
    let mut config = read_config().unwrap_or_default();
    
    config.custom_executable_path = Some(path);
    write_config(&config_file, &config)?;

  tracing::info!("✅ 已保存自定义 Antigravity 可执行文件路径");
    Ok(())
}

/// 写入配置到文件
fn write_config(config_file: &std::path::Path, config: &AntigravityPathConfig) -> Result<(), String> {
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    fs::write(config_file, json).map_err(|e| format!("写入配置文件失败: {}", e))?;
    Ok(())
}

/// 读取配置文件
fn read_config() -> Result<AntigravityPathConfig, String> {
    let config_file = get_config_file_path()?;

    if !config_file.exists() {
        return Ok(AntigravityPathConfig::default());
    }

    let content = fs::read_to_string(&config_file)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let config: AntigravityPathConfig = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置文件失败: {}", e))?;

    Ok(config)
}

/// 从配置文件读取自定义数据目录路径
pub fn get_custom_data_path() -> Result<Option<String>, String> {
    let config = read_config()?;
    Ok(config.custom_data_path)
}

/// 从配置文件读取自定义可执行文件路径
pub fn get_custom_executable_path() -> Result<Option<String>, String> {
    let config = read_config()?;
    Ok(config.custom_executable_path)
}

/// 清除自定义路径配置
#[allow(dead_code)]
pub fn clear_custom_path() -> Result<(), String> {
    let config_file = get_config_file_path()?;

    if config_file.exists() {
        fs::remove_file(&config_file).map_err(|e| format!("删除配置文件失败: {}", e))?;
      tracing::info!("✅ 已清除自定义 Antigravity 路径");
    }

    Ok(())
}

/// 验证数据目录路径是否包含有效的 Antigravity 数据库
pub fn validate_data_path(path: &str) -> bool {
    let path_buf = PathBuf::from(path);
    let db_path = path_buf.join("state.vscdb");
    
    db_path.exists() && db_path.is_file()
}

/// 验证可执行文件路径是否有效
pub fn validate_executable_path(path: &str) -> bool {
    let path_buf = PathBuf::from(path);
    path_buf.exists() && path_buf.is_file()
}

/// 向后兼容：validate_antigravity_path 现在调用 validate_data_path
pub fn validate_antigravity_path(path: &str) -> bool {
    validate_data_path(path)
}
