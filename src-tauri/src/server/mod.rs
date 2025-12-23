use crate::AppState;
use actix_cors::Cors;
use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde_json::json;
use std::sync::Arc;
use tauri::Manager;

// GET /api/status
#[get("/api/status")]
async fn status() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "status": "running",
        "service": "antigravity-agent"
    }))
}

// GET /api/accounts
#[get("/api/accounts")]
async fn get_accounts(data: web::Data<Arc<parking_lot::Mutex<AppState>>>) -> impl Responder {
    tracing::debug!("HTTP: Getting accounts");
    
    let config_dir = {
        let state = data.lock();
        state.config_dir.clone()
    };
    
    let antigravity_dir = config_dir.join("antigravity-accounts");
    if !antigravity_dir.exists() {
        return HttpResponse::Ok().json(Vec::<serde_json::Value>::new());
    }

    let mut accounts = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&antigravity_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "json") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(backup_data) = serde_json::from_str::<serde_json::Value>(&content) {
                         if let Some(jetski_state) = backup_data.get("jetskiStateSync.agentManagerInitState").and_then(|v| v.as_str()) {
                             if let Ok(decoded) = crate::antigravity::account::decode_jetski_state_proto(jetski_state) {
                                 let modified_time = std::fs::metadata(&path).and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                                 accounts.push((modified_time, decoded));
                             }
                         }
                    }
                }
            }
        }
    }
    
    // Sort
    accounts.sort_by(|a, b| b.0.cmp(&a.0));
    let decoded_only: Vec<serde_json::Value> = accounts.into_iter().map(|(_, decoded)| decoded).collect();
    
    HttpResponse::Ok().json(decoded_only)
}

#[derive(serde::Deserialize)]
struct SwitchAccountRequest {
    email: String,
}

#[post("/api/account/switch")]
async fn switch_account(
    req: web::Json<SwitchAccountRequest>,
) -> impl Responder {
    tracing::info!("HTTP Request: Switch to account {}", req.email);

    match crate::commands::account_commands::switch_to_antigravity_account(req.email.clone()).await {
        Ok(_) => HttpResponse::Ok().json(json!({ "success": true })),
        Err(e) => {
            tracing::error!("Failed to switch account via HTTP: {}", e);
            HttpResponse::InternalServerError().json(json!({ "error": e }))
        }
    }
}

/// 启动 HTTP 服务器
pub fn init(app_handle: tauri::AppHandle, state: Arc<parking_lot::Mutex<AppState>>) {
    // Actix-web 需要自己的 system runner，最好不要混用 tauri 的 runtime
    // 我们可以起一个新的 thread 来运行 Actix
    std::thread::spawn(move || {
        let sys = actix_web::rt::System::new();
        
        sys.block_on(async move {
            let server = HttpServer::new(move || {
                let cors = Cors::permissive(); 

                App::new()
                    .wrap(cors)
                    .app_data(web::Data::new(state.clone()))
                    .app_data(web::Data::new(app_handle.clone()))
                    .service(status)
                    .service(get_accounts)
                    .service(switch_account)
            })
            .bind(("127.0.0.1", 18888));

            match server {
                Ok(s) => {
                    tracing::info!("HTTP Server starting on http://127.0.0.1:18888");
                    if let Err(e) = s.run().await {
                        tracing::error!("HTTP Server error: {}", e);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to bind HTTP server port 18888: {}", e);
                }
            }
        });
    });
}
