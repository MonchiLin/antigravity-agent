use tauri::{AppHandle, Manager};
use super::manager::SystemTrayManager;

/// 处理菜单事件
pub async fn handle_menu_event(app: &AppHandle, event_id: &str) {
    match event_id {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        "quit" => {
            app.exit(0);
        }
        "refresh_accounts" => {
            let system_tray = app.state::<SystemTrayManager>();
            if let Err(e) = system_tray.update_menu(app).await {
                eprintln!("刷新托盘菜单失败: {}", e);
            }
        }
        id if id.starts_with("switch_account:") => {
            if let Some(account_name) = id.strip_prefix("switch_account:") {
                println!("📋 菜单: 切换账户 -> {}", account_name);
                let account_name = account_name.to_string();
                
                match crate::commands::account_commands::switch_to_antigravity_account(account_name).await {
                    Ok(msg) => {
                        println!("✅ 账户切换成功: {}", msg);
                        let system_tray = app.state::<SystemTrayManager>();
                        if let Err(e) = system_tray.update_menu(app).await {
                            eprintln!("重建托盘菜单失败: {}", e);
                        }
                    }
                    Err(e) => eprintln!("❌ 账户切换失败: {}", e),
                }
            }
        }
        _ => {}
    }
}
