use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::time::SystemTime;

/// 备份数据收集结构
#[derive(Serialize, Deserialize, Debug)]
pub struct AccountExportedData {
    filename: String,
    #[serde(rename = "content")]
    content: Value,
    #[serde(rename = "timestamp")]
    timestamp: u64,
}

/// 恢复结果
#[derive(Serialize, Deserialize, Debug)]
pub struct RestoreResult {
    #[serde(rename = "restoredCount")]
    restored_count: u32,
    failed: Vec<FailedAccountExportedData>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FailedAccountExportedData {
    filename: String,
    error: String,
}

/// 收集所有账户文件的完整内容, 用于导出
pub async fn collect_contents(
    config_dir: &std::path::Path,
) -> Result<Vec<AccountExportedData>, String> {
    let mut backups_with_content = Vec::new();

    // 读取Antigravity账户目录中的JSON文件
    let antigravity_dir = config_dir.join("antigravity-accounts");

    for entry in fs::read_dir(&antigravity_dir).map_err(|e| format!("读取用户目录失败: {}", e))?
    {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        if path.extension().is_some_and(|ext| ext == "json") {
            let filename = path
                .file_name()
                .and_then(|name| name.to_str())
                .map(|s| s.to_string())
                .unwrap_or_default();

            if filename.is_empty() {
                continue;
            }

            match fs::read_to_string(&path).map_err(|e| format!("读取文件失败 {}: {}", filename, e))
            {
                Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                    Ok(json_value) => {
                        backups_with_content.push(AccountExportedData {
                            filename,
                            content: json_value,
                            timestamp: SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs(),
                        });
                    }
                    Err(e) => {
                        tracing::warn!(target: "backup::scan", filename = %filename, error = %e, "跳过损坏的备份文件");
                    }
                },
                Err(_) => {
                    tracing::warn!(target: "backup::scan", filename = %filename, "跳过无法读取的文件");
                }
            }
        }
    }

    Ok(backups_with_content)
}

/// 恢复备份文件到本地
pub async fn restore_files(
    config_dir: &std::path::Path,
    account_file_data: Vec<AccountExportedData>,
) -> Result<RestoreResult, String> {
    let mut results = RestoreResult {
        restored_count: 0,
        failed: Vec::new(),
    };

    // 获取目标目录
    let antigravity_dir = config_dir.join("antigravity-accounts");

    // 确保目录存在
    if let Err(e) = fs::create_dir_all(&antigravity_dir) {
        return Err(format!("创建目录失败: {}", e));
    }

    // 遍历每个备份
    for account_file in account_file_data {
        let file_path = antigravity_dir.join(&account_file.filename);

        match fs::write(
            &file_path,
            serde_json::to_string_pretty(&account_file.content).unwrap_or_default(),
        )
        .map_err(|e| format!("写入文件失败: {}", e))
        {
            Ok(_) => {
                results.restored_count += 1;
            }
            Err(e) => {
                results.failed.push(FailedAccountExportedData {
                    filename: account_file.filename,
                    error: e,
                });
            }
        }
    }

    Ok(results)
}

/// 删除指定备份
pub async fn delete(config_dir: &std::path::Path, name: String) -> Result<String, String> {
    // 只删除Antigravity账户JSON文件
    let antigravity_dir = config_dir.join("antigravity-accounts");
    let antigravity_file = antigravity_dir.join(format!("{}.json", name));

    fs::remove_file(&antigravity_file).map_err(|e| format!("删除用户文件失败: {}", e))?;
    Ok(format!("删除用户成功: {}", name))
}

/// 清空所有备份
pub async fn clear_all(config_dir: &std::path::Path) -> Result<String, String> {
    let antigravity_dir = config_dir.join("antigravity-accounts");

    // 读取目录中的所有文件
    let mut deleted_count = 0;
    for entry in fs::read_dir(&antigravity_dir).map_err(|e| format!("读取用户目录失败: {}", e))?
    {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        // 只删除 JSON 文件
        if path.extension().is_some_and(|ext| ext == "json") {
            fs::remove_file(&path)
                .map_err(|e| format!("删除文件 {} 失败: {}", path.display(), e))?;
            deleted_count += 1;
        }
    }

    Ok(format!(
        "已清空所有用户备份，共删除 {} 个文件",
        deleted_count
    ))
}
