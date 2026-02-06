// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::{prelude::*, EnvFilter};

// Modules
mod antigravity;
mod app_settings;
mod config_manager;
mod constants;
mod directories;
mod platform;
mod proto;
mod server; // New module
mod services; // Service layer
mod system_tray;
mod utils;
mod window;

mod db_monitor;
mod path_utils;
mod setup;
mod state;

// Re-export AppState for compatibility with other modules
pub use state::{AntigravityAccount, AppState, ProfileInfo};

/// 初始化双层日志系统（控制台 + 文件）
fn init_tracing() -> WorkerGuard {
    let app_settings_path = crate::directories::get_app_settings_file();
    let settings = crate::app_settings::load_settings_from_disk(&app_settings_path);

    // 日志过滤器：默认 info，降低 h2/hyper 噪音（可被 RUST_LOG 覆盖）
    // Debug Mode 开启时：仅放开应用相关的 debug（以及 frontend），避免依赖库（如 reqwest）刷屏。
    let default_filter = if settings.debug_mode {
        "info,antigravity_agent=debug,frontend=debug,app=debug,window=debug,account=debug,restore=debug,cleanup=debug,backup=debug,h2=warn,hyper=warn"
    } else {
        "info,h2=warn,hyper=warn"
    };
    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_filter));

    // 初始化日志目录（失败时直接中止）
    let _log_dir = crate::directories::get_log_directory();

    // 创建滚动文件写入器（带脱敏）
    let file_writer =
        crate::utils::sanitizing_layer::SanitizingFileWriter::new().expect("无法创建文件写入器");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_writer);

    // 设置控制台和文件双层输出
    tracing_subscriber::registry()
        .with(env_filter)
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stdout) // 控制台输出，不脱敏
                .with_target(false)
                .compact()
                .with_ansi(true) // 控制台启用颜色
                .with_filter(LevelFilter::INFO),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking) // 文件输出，自动脱敏
                .with_target(true)
                .with_ansi(false) // 文件不使用颜色代码
                .compact(), // 使用紧凑格式而非 JSON，便于脱敏处理
        )
        .init();

    guard // 返回 guard 以防止日志缓冲区被过早清理
}

fn main() {
    // 初始化双层日志系统（控制台 + 文件）
    let _guard = init_tracing();

    tracing::info!(target: "app::startup", "🚀 启动 Antigravity Agent");
    tracing::info!(target: "app::startup", "📝 日志系统已初始化（控制台 + 文件）");
    tracing::info!(target: "app::startup", "📁 日志目录: {}", crate::directories::get_log_directory().display());

    // 记录系统启动信息
    crate::utils::tracing_config::log_system_info();

    // 阻塞主线程执行一次账户目录迁移检查
    match crate::directories::migrate_legacy_accounts_if_needed() {
        Ok(()) => tracing::info!(target: "app::startup", "📦 账户目录迁移检查完成"),
        Err(e) => tracing::error!(target: "app::startup", "⚠️ 账户目录迁移检查失败: {}", e),
    }

    // 初始化 AppState (内部已包含 Arc<Mutex>)
    let app_state = AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        // 注意：这里我们使用 external state management，以便让 HTTP Server 共享同一个 State
        .manage(app_state.clone())
        .setup(move |app| {
            setup::init(app)?;

            // 启动 HTTP Server
            // 传递相同的 app_state 实例给 server
            let handle = app.handle().clone();
            server::init(handle, app_state.clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
