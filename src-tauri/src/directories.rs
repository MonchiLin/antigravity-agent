use serde_json::{self, Value};
/// 目录获取模块
/// 统一管理所有配置和数据目录路径
use std::fs;
use std::io;
use std::path::PathBuf;
use tracing::{info, warn};

/// 获取应用主配置目录
/// 所有配置、日志、数据都统一存放在用户主目录的 .antigravity-agent 下
pub fn get_config_directory() -> PathBuf {
    let config_dir = dirs::home_dir()
        .expect("Home directory not found")
        .join(".antigravity-agent");

    fs::create_dir_all(&config_dir).unwrap_or_else(|e| {
        panic!("无法创建配置目录 {}: {}", config_dir.display(), e);
    });

    config_dir
}

/// 获取日志目录路径
pub fn get_log_directory() -> PathBuf {
    let log_dir = get_config_directory().join("logs");
    fs::create_dir_all(&log_dir).unwrap_or_else(|e| {
        panic!("无法创建日志目录 {}: {}", log_dir.display(), e);
    });
    log_dir
}

/// 获取账户备份目录
pub fn get_accounts_directory() -> PathBuf {
    let accounts_dir = get_config_directory().join("antigravity-accounts");

    fs::create_dir_all(&accounts_dir).unwrap_or_else(|e| {
        panic!("无法创建账户目录 {}: {}", accounts_dir.display(), e);
    });

    accounts_dir
}

/// 获取应用设置文件路径
pub fn get_app_settings_file() -> PathBuf {
    get_config_directory().join("app_settings.json")
}

/// 获取窗口状态文件路径
pub fn get_window_state_file() -> PathBuf {
    get_config_directory().join("window_state.json")
}

/// 获取 Antigravity 路径配置文件路径
pub fn get_antigravity_path_file() -> PathBuf {
    get_config_directory().join("antigravity_path.json")
}

/// 在应用启动时检查账户备份格式。
/// 发现旧格式账户文件则重命名为 `原文件名.old`。
fn rename_legacy_backup_files_in_dir(dir: &PathBuf, dir_label: &str) -> io::Result<usize> {
    let read_dir = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(0),
        Err(err) => return Err(err),
    };

    let mut renamed_count = 0usize;

    for entry in read_dir {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if !path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.eq_ignore_ascii_case("json"))
            .unwrap_or(false)
        {
            continue;
        }

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(e) => {
                warn!(
                    target: "app::startup",
                    "读取账户文件失败（跳过）: {}，错误: {}",
                    path.display(),
                    e
                );
                continue;
            }
        };

        let value = match serde_json::from_str::<Value>(&content) {
            Ok(v) => v,
            Err(e) => {
                warn!(
                    target: "app::startup",
                    "解析账户 JSON 失败（跳过）: {}，错误: {}",
                    path.display(),
                    e
                );
                continue;
            }
        };

        // 旧格式判定：包含 jetskiStateSync.agentManagerInitState
        if value.get(crate::constants::database::AGENT_STATE).is_none() {
            continue;
        }

        let Some(file_name) = path.file_name().and_then(|f| f.to_str()) else {
            warn!(
                target: "app::startup",
                "文件名无效，无法重命名为 .old: {}",
                path.display()
            );
            continue;
        };

        let old_path = path.with_file_name(format!("{}.old", file_name));
        if old_path.exists() {
            warn!(
                target: "app::startup",
                "目标 .old 文件已存在，跳过重命名: {} -> {}",
                path.display(),
                old_path.display()
            );
            continue;
        }

        match fs::rename(&path, &old_path) {
            Ok(()) => {
                renamed_count += 1;
                info!(
                    target: "app::startup",
                    "检测到旧格式，已重命名({}): {} -> {}",
                    dir_label,
                    path.display(),
                    old_path.display()
                );
            }
            Err(e) => {
                warn!(
                    target: "app::startup",
                    "重命名旧格式文件失败({}): {} -> {}，错误: {}",
                    dir_label,
                    path.display(),
                    old_path.display(),
                    e
                );
            }
        }
    }

    Ok(renamed_count)
}

pub fn migrate_legacy_accounts_if_needed() -> io::Result<()> {
    let new_config_dir = get_config_directory();
    let new_accounts_dir = get_accounts_directory();
    info!(
        target: "app::startup",
        "当前配置目录: {}",
        new_config_dir.display()
    );

    let renamed_current = rename_legacy_backup_files_in_dir(&new_accounts_dir, "当前账户目录")?;
    info!(
        target: "app::startup",
        "当前账户目录旧格式重命名数量: {}",
        renamed_current
    );

    // 旧账户目录（Roaming 配置目录下）
    let Some(config_dir) = dirs::config_dir() else {
        info!(target: "app::startup", "未找到系统配置目录 (dirs::config_dir)，跳过旧账户目录检测");
        return Ok(());
    };
    let legacy_accounts_dir = config_dir
        .join(".antigravity-agent")
        .join("antigravity-accounts");
    info!(
        target: "app::startup",
        "检测旧账户目录: {}",
        legacy_accounts_dir.display()
    );

    let renamed_legacy = rename_legacy_backup_files_in_dir(&legacy_accounts_dir, "旧账户目录")?;
    info!(
        target: "app::startup",
        "旧账户目录旧格式重命名数量: {}",
        renamed_legacy
    );

    Ok(())
}
