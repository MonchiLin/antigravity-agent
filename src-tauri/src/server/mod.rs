use crate::AppState;
use actix_cors::Cors;
use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde_json::json;

mod middleware;
pub mod websocket;

// =============================================================================
// Account Service Endpoints
// =============================================================================

#[get("/api/is_antigravity_running")]
async fn status() -> impl Responder {
    let running = crate::services::account::is_running();
    HttpResponse::Ok().json(running)
}

#[get("/api/get_antigravity_accounts")]
async fn get_accounts(data: web::Data<AppState>) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::account::get_all(&config_dir).await {
        Ok(accounts) => HttpResponse::Ok().json(accounts),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/get_current_antigravity_account_info")]
async fn get_current_account() -> impl Responder {
    match crate::services::account::get_current().await {
        Ok(json) => HttpResponse::Ok().json(json),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/save_antigravity_current_account")]
async fn save_current_account() -> impl Responder {
    match crate::services::account::backup_current().await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct RestoreRequest {
    account_name: String,
}

#[post("/api/restore_antigravity_account")]
async fn restore_account(req: web::Json<RestoreRequest>) -> impl Responder {
    match crate::services::account::restore(req.account_name.clone()).await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct SwitchAccountRequest {
    account_name: String,
}

#[post("/api/switch_to_antigravity_account")]
async fn switch_account(req: web::Json<SwitchAccountRequest>) -> impl Responder {
    match crate::services::account::switch(req.account_name.clone()).await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/clear_all_antigravity_data")]
async fn clear_data() -> impl Responder {
    match crate::services::account::clear_all_data().await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/sign_in_new_antigravity_account")]
async fn sign_in_new() -> impl Responder {
    match crate::services::account::sign_in_new().await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct GetMetricRequest {
    email: String,
}

#[post("/api/get_account_metrics")]
async fn get_metrics(
    data: web::Data<AppState>,
    req: web::Json<GetMetricRequest>,
) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::account::get_metrics(&config_dir, req.email.clone()).await {
        Ok(metrics) => HttpResponse::Ok().json(metrics),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct TriggerRefreshRequest {
    email: String,
}

#[post("/api/trigger_quota_refresh")]
async fn refresh_quota(
    data: web::Data<AppState>,
    req: web::Json<TriggerRefreshRequest>,
) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::account::trigger_quota_refresh(&config_dir, req.email.clone()).await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

// =============================================================================
// Backup Service Endpoints
// =============================================================================

#[get("/api/collect_account_contents")]
async fn collect_backups(data: web::Data<AppState>) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::backup::collect_contents(&config_dir).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/restore_backup_files")]
async fn restore_backups(
    data: web::Data<AppState>,
    req: web::Json<Vec<crate::services::backup::AccountExportedData>>,
) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::backup::restore_files(&config_dir, req.into_inner()).await {
        Ok(res) => HttpResponse::Ok().json(res),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct DeleteBackupRequest {
    name: String,
}

#[post("/api/delete_backup")]
async fn delete_backup(
    data: web::Data<AppState>,
    req: web::Json<DeleteBackupRequest>,
) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::backup::delete(&config_dir, req.name.clone()).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/clear_all_backups")]
async fn clear_backups(data: web::Data<AppState>) -> impl Responder {
    let config_dir = {
        let state = data.inner.lock();
        state.config_dir.clone()
    };

    match crate::services::backup::clear_all(&config_dir).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

// =============================================================================
// Settings Service Endpoints
// =============================================================================

#[derive(serde::Deserialize)]
struct BoolStateRequest {
    enabled: bool,
}

#[get("/api/get_all_settings")]
async fn get_all_settings(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::settings::get_all(&app).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/save_system_tray_state")]
async fn save_tray_state(
    app: web::Data<tauri::AppHandle>,
    req: web::Json<BoolStateRequest>,
) -> impl Responder {
    match crate::services::settings::save_system_tray_state(&app, req.enabled).await {
        Ok(val) => HttpResponse::Ok().json(json!({ "success": true, "value": val })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/save_silent_start_state")]
async fn save_silent_start(
    app: web::Data<tauri::AppHandle>,
    req: web::Json<BoolStateRequest>,
) -> impl Responder {
    match crate::services::settings::save_silent_start_state(&app, req.enabled).await {
        Ok(val) => HttpResponse::Ok().json(json!({ "success": true, "value": val })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/save_private_mode_state")]
async fn save_private_mode(
    app: web::Data<tauri::AppHandle>,
    req: web::Json<BoolStateRequest>,
) -> impl Responder {
    match crate::services::settings::save_private_mode_state(&app, req.enabled).await {
        Ok(val) => HttpResponse::Ok().json(json!({ "success": true, "value": val })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/save_debug_mode_state")]
async fn save_debug_mode(
    app: web::Data<tauri::AppHandle>,
    req: web::Json<BoolStateRequest>,
) -> impl Responder {
    match crate::services::settings::save_debug_mode_state(&app, req.enabled).await {
        Ok(val) => HttpResponse::Ok().json(json!({ "success": true, "value": val })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/get_language")]
async fn get_language(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::settings::get_language(&app).await {
        Ok(lang) => HttpResponse::Ok().json(json!({ "language": lang })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct SetLanguageRequest {
    language: String,
}

#[post("/api/set_language")]
async fn set_language(
    app: web::Data<tauri::AppHandle>,
    req: web::Json<SetLanguageRequest>,
) -> impl Responder {
    match crate::services::settings::set_language(&app, req.language.clone()).await {
        Ok(_) => HttpResponse::Ok().json(json!({ "success": true })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

// =============================================================================
// Platform Service Endpoints
// =============================================================================

#[get("/api/get_platform_info")]
async fn get_platform_info() -> impl Responder {
    match crate::services::platform::get_platform_info().await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/find_antigravity_installations")]
async fn find_installations() -> impl Responder {
    match crate::services::platform::find_antigravity_installations().await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct PathRequest {
    path: String,
}

#[post("/api/validate_antigravity_executable")]
async fn validate_executable(req: web::Json<PathRequest>) -> impl Responder {
    match crate::services::platform::validate_antigravity_executable(req.path.clone()).await {
        Ok(valid) => HttpResponse::Ok().json(json!({ "valid": valid })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/detect_antigravity_installation")]
async fn detect_installation() -> impl Responder {
    match crate::services::platform::detect_antigravity_installation().await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/detect_antigravity_executable")]
async fn detect_executable() -> impl Responder {
    match crate::services::platform::detect_antigravity_executable().await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/save_antigravity_executable")]
async fn save_executable(req: web::Json<PathRequest>) -> impl Responder {
    match crate::services::platform::save_antigravity_executable(req.path.clone()).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/get_current_paths")]
async fn get_paths() -> impl Responder {
    match crate::services::platform::get_current_paths().await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

// =============================================================================
// Crypto Service Endpoints
// =============================================================================

#[derive(serde::Deserialize)]
struct CryptoRequest {
    data: String, // json_data or encrypted_data
    password: String,
}

#[post("/api/encrypt_config_data")]
async fn encrypt_data(req: web::Json<CryptoRequest>) -> impl Responder {
    match crate::services::crypto::encrypt_config_data(req.data.clone(), req.password.clone()).await
    {
        Ok(res) => HttpResponse::Ok().json(json!({ "result": res })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/decrypt_config_data")]
async fn decrypt_data(req: web::Json<CryptoRequest>) -> impl Responder {
    match crate::services::crypto::decrypt_config_data(req.data.clone(), req.password.clone()).await
    {
        Ok(res) => HttpResponse::Ok().json(json!({ "result": res })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

// =============================================================================
// System Service Endpoints
// =============================================================================

#[derive(serde::Deserialize)]
struct UpdateTrayRequest {
    accounts: Vec<String>,
    labels: Option<crate::system_tray::TrayMenuLabels>,
}

#[post("/api/update_tray_menu_command")]
async fn update_tray(
    app: web::Data<tauri::AppHandle>,
    req: web::Json<UpdateTrayRequest>,
) -> impl Responder {
    match crate::services::system::tray::update_menu(&app, req.accounts.clone(), req.labels.clone())
        .await
    {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/minimize_to_tray")]
async fn minimize_tray(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::system::tray::minimize(&app).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/restore_from_tray")]
async fn restore_tray(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::system::tray::restore(&app).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/is_database_monitoring_running")]
async fn is_db_monitor(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::system::db_monitor::is_running(&app).await {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/start_database_monitoring")]
async fn start_db_monitor(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::system::db_monitor::start(&app).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/stop_database_monitoring")]
async fn stop_db_monitor(app: web::Data<tauri::AppHandle>) -> impl Responder {
    match crate::services::system::db_monitor::stop(&app).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct FileWriteRequest {
    path: String,
    content: String,
}

#[post("/api/write_text_file")]
async fn write_file(req: web::Json<FileWriteRequest>) -> impl Responder {
    match crate::services::system::logging::write_text_file(req.path.clone(), req.content.clone())
        .await
    {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/write_frontend_log")]
async fn write_log(req: web::Json<serde_json::Value>) -> impl Responder {
    // req is the raw json object
    match crate::services::system::logging::write_frontend_log(req.into_inner()).await {
        Ok(_) => HttpResponse::Ok().json(json!({ "success": true })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[get("/api/get_log_directory_path")]
async fn get_log_dir() -> impl Responder {
    match crate::services::system::logging::get_directory_path().await {
        Ok(path) => HttpResponse::Ok().json(json!(path)), // Return pure string or wrapped? Command returned string. Adapt to json.
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[post("/api/open_log_directory")]
async fn open_log() -> impl Responder {
    match crate::services::system::logging::open_directory().await {
        Ok(_) => HttpResponse::Ok().json(json!({ "success": true })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

#[derive(serde::Deserialize)]
struct LaunchRequest {
    url: String,
}

#[post("/api/launch_and_install_extension")]
async fn install_ext(req: web::Json<LaunchRequest>) -> impl Responder {
    match crate::services::system::extension::launch_and_install(req.url.clone()).await {
        Ok(msg) => HttpResponse::Ok().json(json!({ "success": true, "message": msg })),
        Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e })),
    }
}

// =============================================================================
// Server Init
// =============================================================================

/// 启动 HTTP 服务器
pub fn init(app_handle: tauri::AppHandle, state: AppState) {
    std::thread::spawn(move || {
        let sys = actix_web::rt::System::new();

        sys.block_on(async move {
            let server = HttpServer::new(move || {
                let cors = Cors::permissive();

                App::new()
                    .wrap(cors)
                    // 使用中间件统一处理 camelCase -> snake_case 参数名
                    .wrap(middleware::CamelCaseToSnakeCase)
                    .app_data(web::Data::new(state.clone()))
                    .app_data(web::Data::new(app_handle.clone()))
                    // Account Service
                    .service(status)
                    .service(get_accounts)
                    .service(get_current_account)
                    .service(save_current_account)
                    .service(restore_account)
                    .service(switch_account)
                    .service(clear_data)
                    .service(sign_in_new)
                    .service(get_metrics)
                    .service(refresh_quota)
                    // Backup Service
                    .service(collect_backups)
                    .service(restore_backups)
                    .service(delete_backup)
                    .service(clear_backups)
                    // Settings Service
                    .service(get_all_settings)
                    .service(save_tray_state)
                    .service(save_silent_start)
                    .service(save_private_mode)
                    .service(save_debug_mode)
                    .service(get_language)
                    .service(set_language)
                    // Platform Service
                    .service(get_platform_info)
                    .service(find_installations)
                    .service(validate_executable)
                    .service(detect_installation)
                    .service(detect_executable)
                    .service(save_executable)
                    .service(get_paths)
                    // Crypto Service
                    .service(encrypt_data)
                    .service(decrypt_data)
                    // System Service
                    .service(update_tray)
                    .service(minimize_tray)
                    .service(restore_tray)
                    .service(is_db_monitor)
                    .service(start_db_monitor)
                    .service(stop_db_monitor)
                    .service(write_file)
                    .service(write_log)
                    .service(get_log_dir)
                    .service(open_log)
                    .service(install_ext)
                    // WebSocket 路由
                    .route("/ws", web::get().to(websocket::ws_handler))
            })
            .bind(("127.0.0.1", 56789));

            match server {
                Ok(s) => {
                    tracing::info!("HTTP Server starting on http://127.0.0.1:56789");
                    if let Err(e) = s.run().await {
                        tracing::error!("HTTP Server error: {}", e);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to bind HTTP server port 56789: {}", e);
                }
            }
        });
    });
}
