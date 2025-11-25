// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]



// Modules
mod antigravity;
mod platform;
mod window;
mod system_tray;
mod constants;
mod config_manager;
mod app_settings;
mod utils;

mod db_monitor;
mod commands;
mod path_utils;
mod state;
mod setup;

// Re-export AppState for compatibility with other modules
pub use state::{AppState, ProfileInfo, AntigravityAccount};

// Use commands
use crate::commands::*;

fn main() {
    println!("🚀 启动 Antigravity Agent");
    println!("🔧 [main] 开始初始化应用程序...");

    // 记录系统启动信息
    crate::utils::tracing_config::log_system_info();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::default())
        .setup(|app| {
            setup::init(app)
        })
        .invoke_handler(tauri::generate_handler![
            backup_profile,
            restore_profile,
            list_backups,
            get_recent_accounts,
            collect_backup_contents,
            restore_backup_files,
            delete_backup,
            clear_all_backups,
            // Antigravity 相关命令
            switch_antigravity_account,
            get_antigravity_accounts,
            get_current_antigravity_info,
            backup_antigravity_current_account,
            restore_antigravity_account,
            switch_to_antigravity_account,
            clear_all_antigravity_data,
            // 进程管理命令
            kill_antigravity,
            is_antigravity_running,
            list_antigravity_processes,
            start_antigravity,
            backup_and_restart_antigravity,
            // 平台支持命令
            get_platform_info,
            find_antigravity_installations,
            get_current_paths,
            // 数据库路径相关
            validate_antigravity_path,
            detect_antigravity_installation,
            save_antigravity_path,
            // 可执行文件路径相关
            validate_antigravity_executable,
            detect_antigravity_executable,
            save_antigravity_executable,
            enable_system_tray,
            disable_system_tray,
            minimize_to_tray,
            restore_from_tray,
            is_system_tray_enabled,
            save_system_tray_state,
            get_system_tray_state,
            toggle_system_tray,
            is_db_monitoring_enabled,
            save_db_monitoring_state,
            is_silent_start_enabled,
            save_silent_start_state,
            get_all_settings,
            // 数据库监控命令
            is_database_monitoring_running,
            start_database_monitoring,
            stop_database_monitoring,
            get_log_info,
            clear_logs,
            decrypt_config_data,
            encrypt_config_data,
            write_text_file,
            write_frontend_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
