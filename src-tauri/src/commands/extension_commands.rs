use crate::platform::antigravity::find_antigravity_installations;
use reqwest::Client;
use std::io::Write;
use std::process::Command;
use tauri::command;
use tempfile::Builder;
use futures_util::StreamExt;

/// 下载 VSIX 文件并调用 Antigravity 安装，最后启动编辑器
#[command]
pub async fn launch_and_install_extension(url: String) -> Result<String, String> {
    tracing::info!("🚀 开始下载插件: {}", url);

    // 1. 下载 VSIX 到临时文件
    let client = Client::new();
    let res = client.get(&url).send().await.map_err(|e| format!("请求失败: {}", e))?;

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
        temp_file.write_all(&chunk).map_err(|e| format!("写入失败: {}", e))?;
    }

    let temp_path = temp_file.path().to_path_buf();
    tracing::info!("📦 插件已下载到: {:?}", temp_path);

    // 2. 寻找 Antigravity 可执行文件
    let installations = find_antigravity_installations();
    if installations.is_empty() {
        return Err("未找到 Antigravity 安装路径".to_string());
    }

    // 这里我们简单起见，尝试使用第一个找到的路径
    // 注意：find_antigravity_installations 返回的是目录，我们需要找到目录下的可执行文件
    // 常规 Antigravity 目录结构中，可执行文件通常叫 Antigravity.exe (Windows) 或 Antigravity (Linux/macOS)
    
    let mut exe_path = None;
    
    for dir in &installations {
        // Windows
        // 1. 优先尝试 bin/antigravity.cmd (CLI wrapper, 能看到输出)
        let win_cmd = dir.join("bin").join("antigravity.cmd");
        if win_cmd.exists() {
            exe_path = Some(win_cmd);
            break;
        }
        // 2. 回退到 Antigravity.exe
        let win_exe = dir.join("Antigravity.exe");
        if win_exe.exists() {
            exe_path = Some(win_exe);
            break;
        }
        
        // Linux / macOS
        // 1. 优先尝试 bin/antigravity
        let bin_exe = dir.join("bin").join("antigravity");
        if bin_exe.exists() {
            exe_path = Some(bin_exe);
            break;
        }
        // 2. macOS .app Bundle 特殊处理
        if dir.extension().map_or(false, |ext| ext == "app") {
             let mac_cli = dir.join("Contents").join("Resources").join("app").join("bin").join("antigravity");
             if mac_cli.exists() {
                 exe_path = Some(mac_cli);
                 break;
             }
        }
    }
    
    // 如果还没找到，尝试硬编码查找 Windows 默认安装位置 (Programs 目录)
    if exe_path.is_none() {
        if let Some(local_app_data) = dirs::data_local_dir() {
             let prog_path = local_app_data.join("Programs").join("Antigravity").join("bin").join("antigravity.cmd");
             if prog_path.exists() {
                 tracing::info!("Found in Local/Programs: {:?}", prog_path);
                 exe_path = Some(prog_path);
             }
        }
    }

    // 如果上述逻辑通过 find_antigravity_installations 找不到（因为它可能只返回数据目录而非程序目录），
    // 我们需要一个更能定位可执行文件的逻辑。
    // 在 starter.rs 中有一个 detect_antigravity_executable()，那是更好的选择。
    
    let target_exe = if let Some(path) = exe_path {
        path
    } else {
        // 回退尝试使用 starter 模块的自动检测
        match crate::antigravity::starter::detect_antigravity_executable() {
            Some(p) => p,
            None => return Err("无法定位 Antigravity 可执行文件，请确保已安装编辑器".to_string()),
        }
    };

    tracing::info!("🛠️ 使用编辑器: {:?}", target_exe);

    // 3. 执行安装命令
    // antigravity --install-extension <path> --force
    tracing::info!("Command: {:?} --install-extension {:?} --force", target_exe, temp_path);
    
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

    // 4. 不再自动启动编辑器，仅安装
    // Command::new(&target_exe)
    //     .spawn()
    //     .map_err(|e| format!("启动编辑器失败: {}", e))?;

    Ok("插件已安装成功".to_string())
}
