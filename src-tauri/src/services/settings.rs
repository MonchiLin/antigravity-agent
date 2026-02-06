use tauri::{AppHandle, Manager};

/// 保存系统托盘状态
pub async fn save_system_tray_state(app: &AppHandle, enabled: bool) -> Result<bool, String> {
    let system_tray = app.state::<crate::system_tray::SystemTrayManager>();

    if enabled {
        system_tray.enable(app)?;
    } else {
        system_tray.disable(app)?;
    }

    Ok(enabled)
}

/// 保存静默启动状态
pub async fn save_silent_start_state(app: &AppHandle, enabled: bool) -> Result<bool, String> {
    let settings_manager = app.state::<crate::app_settings::AppSettingsManager>();

    settings_manager.update_settings(|settings| {
        settings.silent_start_enabled = enabled;
    })?;

    let settings = settings_manager.get_settings();
    Ok(settings.silent_start_enabled)
}

/// 保存隐私模式状态
pub async fn save_private_mode_state(app: &AppHandle, enabled: bool) -> Result<bool, String> {
    let settings_manager = app.state::<crate::app_settings::AppSettingsManager>();

    settings_manager.update_settings(|settings| {
        settings.private_mode = enabled;
    })?;

    let settings = settings_manager.get_settings();
    Ok(settings.private_mode)
}

/// 保存 Debug Mode 状态
pub async fn save_debug_mode_state(app: &AppHandle, enabled: bool) -> Result<bool, String> {
    let settings_manager = app.state::<crate::app_settings::AppSettingsManager>();

    settings_manager.update_settings(|settings| {
        settings.debug_mode = enabled;
    })?;

    let settings = settings_manager.get_settings();
    Ok(settings.debug_mode)
}

/// 获取所有应用设置
pub async fn get_all(app: &AppHandle) -> Result<serde_json::Value, String> {
    let settings_manager = app.state::<crate::app_settings::AppSettingsManager>();
    let settings = settings_manager.get_settings();

    Ok(serde_json::json!({
        "system_tray_enabled": settings.system_tray_enabled,
        "silent_start_enabled": settings.silent_start_enabled,
        "debugMode": settings.debug_mode,
        "privateMode": settings.private_mode,
        "language": settings.language
    }))
}

/// 获取语言偏好设置
pub async fn get_language(app: &AppHandle) -> Result<String, String> {
    let settings_manager = app.state::<crate::app_settings::AppSettingsManager>();
    let settings = settings_manager.get_settings();
    Ok(settings.language.clone())
}

/// 保存语言偏好设置
pub async fn set_language(app: &AppHandle, language: String) -> Result<(), String> {
    // Validate language code
    let valid_languages = vec!["en", "zh-CN", "zh-TW"];
    if !valid_languages.contains(&language.as_str()) {
        return Err(format!("Unsupported language: {}", language));
    }

    let settings_manager = app.state::<crate::app_settings::AppSettingsManager>();
    settings_manager.update_settings(|settings| {
        settings.language = language.clone();
    })?;

    tracing::info!("Language preference saved: {}", language);
    Ok(())
}
