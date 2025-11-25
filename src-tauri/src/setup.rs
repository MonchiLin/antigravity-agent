use tauri::{App, Manager};
use std::sync::Arc;
use crate::{app_settings, system_tray, db_monitor, window, state::AppState};

pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    println!("🔧 [setup] 开始应用程序设置...");
    
    // 初始化应用设置管理器
    let app_handle = app.handle();
    app.manage(app_settings::AppSettingsManager::new(app_handle));
    
    // 初始化系统托盘管理器
    app.manage(system_tray::SystemTrayManager::new());

    // 初始化 Tracing 日志记录器
    println!("🔧 [setup] 初始化 Tracing 日志记录器...");
    // 使用应用的实际配置目录，与 AppState 保持一致
    let app_state = app.state::<AppState>();
    let config_dir = app_state.inner().config_dir.clone();

    match crate::utils::tracing_config::init_tracing(&config_dir) {
        Ok(_) => println!("✅ [setup] Tracing 日志记录器初始化完成"),
        Err(e) => println!("⚠️ [setup] Tracing 日志记录器初始化失败: {}", e),
    }

    // 在 release 模式下禁用右键菜单
    #[cfg(not(debug_assertions))]
    {
        if let Some(window) = app.get_webview_window("main") {
            // Tauri 2.x 中禁用上下文菜单需要通过eval执行JavaScript
            let _ = window
                .eval("window.addEventListener('contextmenu', e => e.preventDefault());");
        }
    }

    // 初始化系统托盘管理器
    println!("🔧 [setup] 开始初始化系统托盘管理器...");
    let system_tray = app.state::<system_tray::SystemTrayManager>();
    match system_tray.initialize(app.handle()) {
        Ok(_) => println!("✅ [setup] 系统托盘管理器初始化成功"),
        Err(e) => println!("⚠️ [setup] 系统托盘管理器初始化失败: {}", e),
    }

    // 初始化数据库监控器
    println!("🔧 [setup] 开始初始化数据库监控器...");
    let db_monitor = Arc::new(db_monitor::DatabaseMonitor::new(app.handle().clone()));
    app.manage(db_monitor.clone());

    // 数据库监控将在前端通过命令启动，避免在 setup 中使用 tokio::spawn
    println!("ℹ️ [setup] 数据库监控将根据前端设置自动启动");

    println!("✅ [setup] 数据库监控器初始化完成");

    // 初始化窗口事件处理器
    println!("🔧 [setup] 初始化窗口事件处理器...");
    if let Err(e) = window::init_window_event_handler(app) {
        eprintln!("⚠️  窗口事件处理器初始化失败: {}", e);
    }
    println!("✅ [setup] 窗口事件处理器初始化完成");

    // 检查静默启动设置
    println!("🔧 [setup] 检查静默启动设置...");
    let settings_manager = app.state::<app_settings::AppSettingsManager>();
    let settings = settings_manager.get_settings();

    if settings.silent_start_enabled {
        println!("🔇 [setup] 静默启动模式已启用，准备隐藏主窗口");

        // 延迟执行静默启动，确保在窗口状态恢复完成后隐藏窗口
        let app_handle_for_silent = app.handle().clone();
        let system_tray_enabled = settings.system_tray_enabled;

        tauri::async_runtime::spawn(async move {
            // 等待1.5秒，确保窗口状态恢复和其他初始化都完成
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

            println!("🔇 [silent-start] 执行静默启动窗口隐藏操作...");

            if let Some(main_window) = app_handle_for_silent.get_webview_window("main") {
                // 隐藏窗口
                match main_window.hide() {
                    Ok(()) => {
                        println!("✅ [silent-start] 静默启动：窗口已隐藏");

                        // 如果启用了系统托盘，提示用户可通过托盘访问
                        if system_tray_enabled {
                            println!("📱 [silent-start] 静默启动 + 系统托盘：可通过系统托盘图标访问应用");
                        } else {
                            println!("⚠️  [silent-start] 静默启动但系统托盘未启用：用户需要通过其他方式访问应用");
                        }
                    }
                    Err(e) => {
                        eprintln!("⚠️  [silent-start] 静默启动隐藏窗口失败: {}", e);
                    }
                }
            } else {
                eprintln!("⚠️  [silent-start] 无法获取主窗口进行静默启动");
            }
        });
    } else {
        println!("ℹ️ [setup] 静默启动未启用，正常显示窗口");
    }

    println!("✅ [setup] 应用程序设置完成");
    Ok(())
}
