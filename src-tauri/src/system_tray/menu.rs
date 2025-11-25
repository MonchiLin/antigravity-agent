use tauri::{
    menu::{MenuBuilder, MenuItem, SubmenuBuilder},
    AppHandle, Manager, Wry,
};

/// 构建托盘菜单
pub async fn build_menu(app_handle: &AppHandle) -> tauri::Result<tauri::menu::Menu<Wry>> {
    let mut menu_builder = MenuBuilder::new(app_handle);

    // 1. 获取账户列表
    let state = app_handle.state::<crate::AppState>();
    let recent_accounts = crate::commands::backup_commands::get_recent_accounts(state.clone(), Some(2)).await.unwrap_or_default();
    let all_accounts = crate::commands::backup_commands::get_recent_accounts(state.clone(), None).await.unwrap_or_default();

    // 2. 添加账户相关菜单
    if !all_accounts.is_empty() {
        // 快速切换（最近2个账户）
        if !recent_accounts.is_empty() {
            let label_item = MenuItem::new(app_handle, "快速切换", false, None::<&str>)?;
            menu_builder = menu_builder.item(&label_item);

            for account in &recent_accounts {
                let menu_id = format!("switch_account:{}", account);
                let item = MenuItem::with_id(
                    app_handle,
                    &menu_id,
                    format!("  {}", account),
                    true,
                    None::<&str>,
                )?;
                menu_builder = menu_builder.item(&item);
            }

            menu_builder = menu_builder.separator();
        }

        // 所有账户子菜单（超过2个时显示）
        if all_accounts.len() > 2 {
            let mut submenu_builder = SubmenuBuilder::new(app_handle, "所有账户");

            for account in &all_accounts {
                let menu_id = format!("switch_account:{}", account);
                let item = MenuItem::with_id(
                    app_handle,
                    &menu_id,
                    account,
                    true,
                    None::<&str>,
                )?;
                submenu_builder = submenu_builder.item(&item);
            }

            let submenu = submenu_builder.build()?;
            menu_builder = menu_builder.item(&submenu);
            menu_builder = menu_builder.separator();
        }

        // 刷新账户列表
        let refresh_item = MenuItem::with_id(
            app_handle,
            "refresh_accounts",
            "刷新账户列表",
            true,
            None::<&str>,
        )?;
        menu_builder = menu_builder.item(&refresh_item);
        menu_builder = menu_builder.separator();
    }

    // 3. 窗口控制菜单
    let show_item = MenuItem::with_id(app_handle, "show", "显示窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app_handle, "hide", "隐藏窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app_handle, "quit", "退出应用", true, None::<&str>)?;

    menu_builder = menu_builder
        .item(&show_item)
        .separator()
        .item(&hide_item)
        .separator()
        .item(&quit_item);

    menu_builder.build()
}
