use crate::{app_settings, db_monitor, system_tray, window};
use std::sync::Arc;
use tauri::{App, Manager};

pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    tracing::info!(target: "app::setup", "开始应用程序设置");

    // 初始化应用设置管理器
    let app_handle = app.handle();
    app.manage(app_settings::AppSettingsManager::new(app_handle));

    // 初始化系统托盘管理器
    app.manage(system_tray::SystemTrayManager::new());

    // 在 release 模式下禁用右键菜单
    #[cfg(not(debug_assertions))]
    {
        if let Some(window) = app.get_webview_window("main") {
            // Tauri 2.x 中禁用上下文菜单需要通过eval执行JavaScript
            let _ = window.eval("window.addEventListener('contextmenu', e => e.preventDefault());");
        }
    }

    // 初始化数据库监控器
    let db_monitor = Arc::new(db_monitor::DatabaseMonitor::new(app.handle().clone()));
    app.manage(db_monitor.clone());

    // 数据库监控将在前端通过命令启动，避免在 setup 中使用 tokio::spawn
    tracing::debug!(target: "app::setup::db_monitor", "数据库监控将根据前端设置自动启动");

    // 初始化窗口事件处理器
    if let Err(e) = window::init_window_event_handler(app) {
        tracing::error!(target: "app::setup::window", error = %e, "窗口事件处理器初始化失败");
    } else {
        tracing::info!(target: "app::setup::window", "窗口事件处理器初始化完成");
    }

    // 检查静默启动设置
    let settings_manager = app.state::<app_settings::AppSettingsManager>();
    let settings = settings_manager.get_settings();

    // 根据设置决定是否创建系统托盘
    if settings.system_tray_enabled {
        tracing::info!(target: "app::setup::tray", "系统托盘已启用，正在创建托盘");
        let system_tray = app.state::<system_tray::SystemTrayManager>();
        if let Err(e) = system_tray.enable(app.handle()) {
            tracing::error!(target: "app::setup::tray", error = %e, "启动时创建系统托盘失败");
        } else {
            tracing::info!(target: "app::setup::tray", "系统托盘已创建");
        }
    } else {
        tracing::info!(target: "app::setup::tray", "系统托盘已禁用，跳过创建");
    }

    // 静默启动配置已在 AppSettingsManager 中统一校验
    if settings.silent_start_enabled {
        tracing::info!(target: "app::setup::silent_start", "静默启动模式已启用（系统托盘已启用），准备隐藏主窗口");

        // 延迟执行静默启动，确保在窗口状态恢复完成后隐藏窗口
        let app_handle_for_silent = app.handle().clone();

        tauri::async_runtime::spawn(async move {
            // 等待1.5秒，确保窗口状态恢复和其他初始化都完成
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

            tracing::debug!(target: "app::setup::silent_start", "执行静默启动窗口隐藏操作");

            if let Some(main_window) = app_handle_for_silent.get_webview_window("main") {
                // 隐藏窗口
                match main_window.hide() {
                    Ok(()) => {
                        tracing::info!(target: "app::setup::silent_start", "静默启动：窗口已隐藏");
                        tracing::info!(target: "app::setup::silent_start", "可通过系统托盘图标访问应用");
                    }
                    Err(e) => {
                        tracing::error!(target: "app::setup::silent_start", error = %e, "静默启动隐藏窗口失败");
                    }
                }
            } else {
                tracing::error!(target: "app::setup::silent_start", "无法获取主窗口进行静默启动");
            }
        });
    } else {
        tracing::debug!(target: "app::setup::silent_start", "静默启动未启用，正常显示窗口");
    }

    tracing::info!(target: "app::setup", "应用程序设置完成");
    Ok(())
}
