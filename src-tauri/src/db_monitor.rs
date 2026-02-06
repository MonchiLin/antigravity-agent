//! 数据库监控模块 - 监控关键 key 的变化并推送事件

use crate::constants::database;
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

/// 数据库监控器
pub struct DatabaseMonitor {
    app_handle: AppHandle,
    last_data: Arc<Mutex<Option<Value>>>,
    is_running: Arc<Mutex<bool>>,
}

impl DatabaseMonitor {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            last_data: Arc::new(Mutex::new(None)),
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// 启动数据库监控
    pub async fn start_monitoring(&self) {
        info!("🔧 启动数据库自动监控");

        let last_data = self.last_data.clone();
        let is_running = self.is_running.clone();
        let app_handle = self.app_handle.clone();

        *is_running.lock().await = true;

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(10));

            loop {
                interval.tick().await;

                if !*is_running.lock().await {
                    info!("⏹️ 数据库监控已停止");
                    break;
                }

                let Some(new_data) = Self::get_data() else {
                    continue;
                };

                let mut last = last_data.lock().await;

                // 首次加载只缓存数据，不发送事件
                let has_changes = match last.as_ref() {
                    Some(old) => old != &new_data,
                    None => false, // 首次加载不触发事件
                };

                if has_changes {
                    info!("📢 检测到数据库变化");
                    if let Err(e) = app_handle.emit("database-changed", &new_data) {
                        error!("❌ 推送事件失败: {}", e);
                    }
                }

                *last = Some(new_data);
            }
        });
    }

    /// 停止数据库监控
    pub async fn stop_monitoring(&self) {
        info!("⏹️ 停止数据库自动监控");
        *self.is_running.lock().await = false;
    }

    /// 获取数据库数据（失败返回 None，内部记录日志）
    fn get_data() -> Option<Value> {
        let db_path = crate::platform::get_antigravity_db_path()?;

        let conn = match rusqlite::Connection::open(&db_path) {
            Ok(c) => c,
            Err(e) => {
                warn!("打开数据库失败: {}", e);
                return None;
            }
        };

        let keys = [
            database::USER_STATUS,
            database::OAUTH_TOKEN,
            database::AUTH_STATUS,
        ];
        let mut stmt = conn
            .prepare("SELECT key, value FROM ItemTable WHERE key IN (?, ?, ?)")
            .ok()?;

        let rows: Vec<(String, String)> = stmt
            .query_map(rusqlite::params![keys[0], keys[1], keys[2]], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .ok()?
            .filter_map(|r| r.ok())
            .collect();

        let mut data = serde_json::Map::new();
        for (key, value) in rows {
            let json_value = serde_json::from_str(&value).unwrap_or(Value::String(value));
            data.insert(key, json_value);
        }

        Some(Value::Object(data))
    }
}
