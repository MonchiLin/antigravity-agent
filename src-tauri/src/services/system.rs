use std::sync::Arc;
use tauri::{AppHandle, Manager};

pub mod tray {
    use super::*;
    use crate::system_tray::{update_tray_menu, SystemTrayManager, TrayMenuLabels};

    pub async fn update_menu(
        app: &AppHandle,
        accounts: Vec<String>,
        labels: Option<TrayMenuLabels>,
    ) -> Result<String, String> {
        update_tray_menu(app, accounts, labels)?;
        Ok("托盘菜单已更新".to_string())
    }

    pub async fn minimize(app: &AppHandle) -> Result<String, String> {
        let system_tray = app.state::<SystemTrayManager>();
        system_tray.minimize_to_tray(app)?;
        Ok("已最小化到托盘".to_string())
    }

    pub async fn restore(app: &AppHandle) -> Result<String, String> {
        let system_tray = app.state::<SystemTrayManager>();
        system_tray.restore_from_tray(app)?;
        Ok("已恢复窗口".to_string())
    }
}

pub mod db_monitor {
    use super::*;
    use crate::db_monitor::DatabaseMonitor;

    pub async fn is_running(_app: &AppHandle) -> Result<bool, String> {
        // 智能监控现在是默认功能，总是返回 true
        Ok(true)
    }

    pub async fn start(app: &AppHandle) -> Result<String, String> {
        let monitor = app.state::<Arc<DatabaseMonitor>>();
        monitor.start_monitoring().await;
        Ok("数据库监控已启动".to_string())
    }

    pub async fn stop(app: &AppHandle) -> Result<String, String> {
        let monitor = app.state::<Arc<DatabaseMonitor>>();
        monitor.stop_monitoring().await;
        Ok("数据库监控已停止".to_string())
    }
}

pub mod logging {
    use std::fs;
    use std::path::Path;

    pub async fn write_text_file(path: String, content: String) -> Result<String, String> {
        let file_path = Path::new(&path);

        // 确保父目录存在
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }

        // 写入文件
        fs::write(file_path, content).map_err(|e| format!("写入文件失败: {}", e))?;

        Ok(format!("文件写入成功: {}", path))
    }

    pub async fn write_frontend_log(log_entry: serde_json::Value) -> Result<(), String> {
        use tracing::{debug, error, info, warn};

        // level: 'info' | 'warn' | 'error' | 'debug'
        let level_str = log_entry
            .get("level")
            .and_then(|v| v.as_str())
            .unwrap_or("info");

        // message
        let message = log_entry
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // details（前端会把对象 JSON.stringify 成字符串）
        let details = log_entry.get("details").and_then(|v| v.as_str());

        // module：优先顶层；否则尝试从 details(JSON) 提取 module 字段
        let module = log_entry
            .get("module")
            .and_then(|v| v.as_str())
            .map(ToOwned::to_owned)
            .or_else(|| {
                let details_str = details?;
                let details_json = serde_json::from_str::<serde_json::Value>(details_str).ok()?;
                details_json
                    .get("module")
                    .and_then(|v| v.as_str())
                    .map(ToOwned::to_owned)
            })
            .unwrap_or_else(|| "frontend".to_string());

        let full_message = if message.is_empty() {
            format!("[{}]", module)
        } else {
            format!("[{}] {}", module, message)
        };

        // tracing 的 target 需要静态字符串；统一用 "frontend" 方便过滤（RUST_LOG / Debug Mode）
        match level_str {
            "error" => match details {
                Some(details) => error!(
                    target: "frontend",
                    module = module.as_str(),
                    details = %details,
                    "{}",
                    full_message
                ),
                None => error!(target: "frontend", module = module.as_str(), "{}", full_message),
            },
            "warn" => match details {
                Some(details) => warn!(
                    target: "frontend",
                    module = module.as_str(),
                    details = %details,
                    "{}",
                    full_message
                ),
                None => warn!(target: "frontend", module = module.as_str(), "{}", full_message),
            },
            "debug" => match details {
                Some(details) => debug!(
                    target: "frontend",
                    module = module.as_str(),
                    details = %details,
                    "{}",
                    full_message
                ),
                None => debug!(target: "frontend", module = module.as_str(), "{}", full_message),
            },
            _ => match details {
                Some(details) => info!(
                    target: "frontend",
                    module = module.as_str(),
                    details = %details,
                    "{}",
                    full_message
                ),
                None => info!(target: "frontend", module = module.as_str(), "{}", full_message),
            },
        }

        Ok(())
    }

    pub async fn get_directory_path() -> Result<String, String> {
        let log_dir = crate::directories::get_log_directory();
        Ok(log_dir.display().to_string())
    }

    pub async fn open_directory() -> Result<(), String> {
        let log_dir = crate::directories::get_log_directory();
        tauri_plugin_opener::open_path(&log_dir, None::<&str>)
            .map_err(|e| format!("打开日志目录失败: {}", e))?;
        Ok(())
    }
}

pub mod extension {
    use crate::platform::antigravity::find_antigravity_installations;
    use futures_util::StreamExt;
    use reqwest::Client;
    use std::io::Write;
    use std::process::Command;
    use tempfile::Builder;

    pub async fn launch_and_install(url: String) -> Result<String, String> {
        tracing::info!("🚀 开始下载插件: {}", url);

        // 1. 下载 VSIX 到临时文件
        let client = Client::new();
        let res = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("下载失败，状态码: {}", res.status()));
        }

        // 创建临时文件 (使用 .vsix 后缀)
        let mut temp_file = Builder::new()
            .suffix(".vsix")
            .tempfile()
            .map_err(|e| format!("无法创建临时文件: {}", e))?;

        let mut stream = res.bytes_stream();
        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| format!("读取流失败: {}", e))?;
            temp_file
                .write_all(&chunk)
                .map_err(|e| format!("写入失败: {}", e))?;
        }

        let temp_path = temp_file.path().to_path_buf();
        tracing::info!("📦 插件已下载到: {:?}", temp_path);

        // 2. 寻找 Antigravity 可执行文件
        let installations = find_antigravity_installations();
        if installations.is_empty() {
            return Err("未找到 Antigravity 安装路径".to_string());
        }

        let mut exe_path = None;

        for dir in &installations {
            let win_cmd = dir.join("bin").join("antigravity.cmd");
            if win_cmd.exists() {
                exe_path = Some(win_cmd);
                break;
            }
            let win_exe = dir.join("Antigravity.exe");
            if win_exe.exists() {
                exe_path = Some(win_exe);
                break;
            }

            let bin_exe = dir.join("bin").join("antigravity");
            if bin_exe.exists() {
                exe_path = Some(bin_exe);
                break;
            }
            if dir.extension().map_or(false, |ext| ext == "app") {
                let mac_cli = dir
                    .join("Contents")
                    .join("Resources")
                    .join("app")
                    .join("bin")
                    .join("antigravity");
                if mac_cli.exists() {
                    exe_path = Some(mac_cli);
                    break;
                }
            }
        }

        if exe_path.is_none() {
            if let Some(local_app_data) = dirs::data_local_dir() {
                let prog_path = local_app_data
                    .join("Programs")
                    .join("Antigravity")
                    .join("bin")
                    .join("antigravity.cmd");
                if prog_path.exists() {
                    tracing::info!("Found in Local/Programs: {:?}", prog_path);
                    exe_path = Some(prog_path);
                }
            }
        }

        let target_exe = if let Some(path) = exe_path {
            path
        } else {
            match crate::antigravity::starter::detect_antigravity_executable() {
                Some(p) => p,
                None => {
                    return Err("无法定位 Antigravity 可执行文件，请确保已安装编辑器".to_string())
                }
            }
        };

        tracing::info!("🛠️ 使用编辑器: {:?}", target_exe);

        tracing::info!(
            "Command: {:?} --install-extension {:?} --force",
            target_exe,
            temp_path
        );

        let install_output = Command::new(&target_exe)
            .arg("--install-extension")
            .arg(&temp_path)
            .arg("--force")
            .output()
            .map_err(|e| format!("执行安装命令失败: {}", e))?;

        if !install_output.status.success() {
            let stderr = String::from_utf8_lossy(&install_output.stderr);
            return Err(format!("安装插件失败: {}", stderr));
        }

        tracing::info!("✅ 插件安装成功");

        Ok("插件已安装成功".to_string())
    }
}
