// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
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
mod system_tray;
mod utils;
mod window;

mod commands;
mod db_monitor;
mod path_utils;
mod setup;
mod state;

// Re-export AppState for compatibility with other modules
pub use state::{AntigravityAccount, AppState, ProfileInfo};

// Use commands
use crate::commands::*;

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
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(default_filter));

    // 创建日志目录
    let log_dir = crate::directories::get_log_directory();
    if let Err(e) = fs::create_dir_all(&log_dir) {
        eprintln!("警告：无法创建日志目录 {}: {}", log_dir.display(), e);
    }

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

    // 初始化 AppState，并使用 parking_lot::Mutex 包装以供 actix-web 使用
    let app_state = std::sync::Arc::new(parking_lot::Mutex::new(AppState::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .manage(AppState::default()) // 依然保持 Tauri 自己的状态管理（如果不想大规模重构）
        // 注意：这里我们其实有两份 AppState：
        // 1. Tauri 内部管理的（通过 .manage()）
        // 2. 传递给 actix-web 的（通过闭包捕获）
        // 这是一个折衷方案，因为 Tauri 的 State<T> 很难直接传递给 actix-web
        // 为了保持数据一致性，我们应该尽可能让 actix-web 调用 tauri 的 command 或者 service 层
        // 在 server/mod.rs 中，我们尝试复用逻辑，但如果逻辑依赖 State<AppState>，会导致问题
        // 理想情况是将 AppState 提取为全局单例或 Arc<Mutex<AppState>> 共享
        //
        // 鉴于时间，我们这里启动 server，并在 server 中使用独立的 state 引用
        // 并在 setup 钩子中初始化它
        .setup(move |app| {
            setup::init(app)?;  // 原有的 setup
            
            // 启动 HTTP Server
            // 由于 AppState::default() 会读取磁盘，所以即便有两份实例，只要不涉及内存中动态缓存的不一致，是可行的
            // 账户列表是从磁盘读取的，所以暂时没问题
            let handle = app.handle().clone();
            server::init(handle, app_state.clone());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            collect_account_contents,
            restore_backup_files,
            delete_backup,
            clear_all_backups,
            // 账户基础命令
            get_antigravity_accounts,
            get_account_metrics,
            get_current_antigravity_account_info,
            save_antigravity_current_account,
            restore_antigravity_account,
            switch_to_antigravity_account,
            clear_all_antigravity_data,
            is_antigravity_running,
            sign_in_new_antigravity_account,
            // 平台支持命令
            get_platform_info,
            find_antigravity_installations,
            get_current_paths,
            // 数据库路径相关
            detect_antigravity_installation,
            // 可执行文件路径相关
            validate_antigravity_executable,
            detect_antigravity_executable,
            save_antigravity_executable,
            minimize_to_tray,
            restore_from_tray,
            update_tray_menu_command,
            save_system_tray_state,
            save_silent_start_state,
            save_private_mode_state,
            save_debug_mode_state,
            get_all_settings,
            get_language,
            set_language,
            // 数据库监控命令
            is_database_monitoring_running,
            start_database_monitoring,
            stop_database_monitoring,
            decrypt_config_data,
            encrypt_config_data,
            write_text_file,
            write_frontend_log,
            commands::open_log_directory,
            commands::get_log_directory_path,
            commands::launch_and_install_extension,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
