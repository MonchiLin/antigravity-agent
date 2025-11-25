//! 平台支持命令
//! 负责获取平台信息、安装位置验证等跨平台操作

use serde_json::Value;

/// 获取平台信息
#[tauri::command]
pub async fn get_platform_info() -> Result<Value, String> {
    let os_type = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let family = std::env::consts::FAMILY;

    let antigravity_available = crate::platform::is_antigravity_available();
    let antigravity_paths = crate::platform::get_all_antigravity_db_paths();

    Ok(serde_json::json!({
        "os": os_type,
        "arch": arch,
        "family": family,
        "antigravity_available": antigravity_available,
        "antigravity_paths": antigravity_paths.iter().map(|p| p.to_string_lossy()).collect::<Vec<_>>(),
        "config_dir": dirs::config_dir().map(|p| p.to_string_lossy().to_string()),
        "data_dir": dirs::data_dir().map(|p| p.to_string_lossy().to_string()),
        "home_dir": dirs::home_dir().map(|p| p.to_string_lossy().to_string())
    }))
}

/// 查找 Antigravity 安装位置
#[tauri::command]
pub async fn find_antigravity_installations() -> Result<Vec<String>, String> {
    let paths = crate::platform::find_antigravity_installations();
    Ok(paths
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

/// 验证 Antigravity 数据目录路径
#[tauri::command]
pub async fn validate_antigravity_path(path: String) -> Result<bool, String> {
    Ok(crate::antigravity::path_config::validate_antigravity_path(&path))
}

/// 验证 Antigravity 可执行文件路径
#[tauri::command]
pub async fn validate_antigravity_executable(path: String) -> Result<bool, String> {
    Ok(crate::antigravity::path_config::validate_executable_path(&path))
}

/// 检测 Antigravity 安装状态（数据库路径）
#[tauri::command]
pub async fn detect_antigravity_installation() -> Result<serde_json::Value, String> {
    // 1. 尝试从配置读取自定义路径
    let custom_path = crate::antigravity::path_config::get_custom_data_path()
        .unwrap_or(None);
    
    // 2. 检查自定义路径是否有效
    if let Some(ref path) = custom_path {
        if crate::antigravity::path_config::validate_antigravity_path(path) {
            return Ok(serde_json::json!({
                "found": true,
                "path": path,
                "isCustomPath": true
            }));
        }
    }
    
    // 3. 尝试自动检测（get_antigravity_db_path 会在自定义路径无效时回退）
    if let Some(db_path) = crate::platform::get_antigravity_db_path() {
        if db_path.exists() {
            let data_dir = db_path.parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            
            println!("📁 检测到 Antigravity 数据库: {}", db_path.display());
            println!("📂 Antigravity 数据目录: {}", data_dir);
            
            return Ok(serde_json::json!({
                "found": true,
                "path": data_dir,
                "isCustomPath": false
            }));
        }
    }
    
    // 4. 未找到
    println!("⚠️ 未找到 Antigravity 数据库，请手动选择路径");
    Ok(serde_json::json!({
        "found": false,
        "path": null,
        "isCustomPath": false
    }))
}

/// 检测 Antigravity 可执行文件
#[tauri::command]
pub async fn detect_antigravity_executable() -> Result<serde_json::Value, String> {
    // 1. 尝试从配置读取自定义可执行文件路径
    let custom_exec = crate::antigravity::path_config::get_custom_executable_path()
        .unwrap_or(None);
    
    // 2. 检查自定义可执行文件路径是否有效
    if let Some(ref path) = custom_exec {
        if crate::antigravity::path_config::validate_executable_path(path) {
            return Ok(serde_json::json!({
                "found": true,
                "path": path,
                "isCustomPath": true
            }));
        }
    }
    
    // 3. 尝试自动检测
    let detected_path = crate::antigravity::starter::detect_antigravity_executable();
    if let Some(exec_path) = detected_path {
        println!("✅ 检测到 Antigravity 可执行文件: {}", exec_path.display());
        
        return Ok(serde_json::json!({
            "found": true,
            "path": exec_path.to_string_lossy().to_string(),
            "isCustomPath": false
        }));
    }
    
    // 4. 未找到
    println!("⚠️ 未找到 Antigravity 可执行文件，启动功能可能不可用");
    Ok(serde_json::json!({
        "found": false,
        "path": null,
        "isCustomPath": false
    }))
}

/// 保存用户自定义的 Antigravity 数据目录路径
#[tauri::command]
pub async fn save_antigravity_path(path: String) -> Result<String, String> {
    // 1. 验证路径有效性
    if !crate::antigravity::path_config::validate_antigravity_path(&path) {
        return Err(format!("路径无效：未在目录 '{}' 中找到 state.vscdb 文件", path));
    }
    
    // 2. 保存路径到配置
    crate::antigravity::path_config::save_custom_data_path(path.clone())?;
    
    Ok(format!("已保存 Antigravity 数据目录路径: {}", path))
}

/// 保存用户自定义的 Antigravity 可执行文件路径
#[tauri::command]
pub async fn save_antigravity_executable(path: String) -> Result<String, String> {
    // 1. 验证路径有效性
    if !crate::antigravity::path_config::validate_executable_path(&path) {
        return Err(format!("路径无效：文件 '{}' 不存在或不是可执行文件", path));
    }
    
    // 2. 保存路径到配置
    crate::antigravity::path_config::save_custom_executable_path(path.clone())?;
    
    Ok(format!("已保存 Antigravity 可执行文件路径: {}", path))
}

/// 获取当前配置的路径
#[tauri::command]
pub async fn get_current_paths() -> Result<serde_json::Value, String> {
    let data_path = crate::antigravity::path_config::get_custom_data_path()
        .unwrap_or(None);
    let exec_path = crate::antigravity::path_config::get_custom_executable_path()
        .unwrap_or(None);
    
    Ok(serde_json::json!({
        "dataPath": data_path,
        "executablePath": exec_path
    }))
}
