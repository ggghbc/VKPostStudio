mod services;
mod vk;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use services::pattern_engine::{PatternConfig, PatternEngine};
use services::transfer_worker::TransferWorker;
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;
use vk::client::VkClient;

pub struct AppState {
    pub db: SqlitePool,
    pub active_vk: Arc<Mutex<Option<VkClient>>>,
}

#[derive(Serialize, Deserialize)]
pub struct TargetDto {
    pub id: i64,
    pub title: String,
    pub owner_id: i64,
    pub target_type: String,
}

#[derive(Serialize, Deserialize)]
pub struct PatternDto {
    pub id: i64,
    pub name: String,
    pub timezone: String,
    pub times_json: String,
}

#[derive(Serialize, Deserialize)]
pub struct PostDto {
    pub id: i64,
    pub text: String,
    pub scheduled_at_utc: String,
    pub status: String,
    pub author_name: Option<String>,
    pub attachments_count: i64,
}

#[tauri::command]
async fn set_access_token(token: String, state: State<'_, AppState>) -> Result<String, String> {
    let client = VkClient::new(token.clone());
    let (user_id, name) = client.verify_token().await.map_err(|e| e.to_string())?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE accounts SET is_active = 0")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let account_id = sqlx::query("INSERT INTO accounts (name, user_id, is_active) VALUES (?, ?, 1) RETURNING id")
        .bind(&name)
        .bind(user_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get::<i64, _>("id");

    sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title) VALUES (?, 'user', ?, ?)")
        .bind(account_id)
        .bind(user_id)
        .bind(format!("Мой профиль ({})", name))
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if let Ok(groups) = client.get_admin_groups().await {
        for (owner_id, group_title, photo) in groups {
            sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title, photo_url) VALUES (?, 'community', ?, ?, ?)")
                .bind(account_id)
                .bind(owner_id)
                .bind(group_title)
                .bind(photo)
                .execute(&mut *tx)
                .await
                .ok();
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    let mut vk_guard = state.active_vk.lock().await;
    *vk_guard = Some(client);

    Ok(name)
}

#[tauri::command]
async fn get_targets(state: State<'_, AppState>) -> Result<Vec<TargetDto>, String> {
    let rows = sqlx::query("SELECT id, title, owner_id, target_type FROM targets ORDER BY id ASC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| TargetDto {
            id: r.get("id"),
            title: r.get("title"),
            owner_id: r.get("owner_id"),
            target_type: r.get("target_type"),
        })
        .collect())
}

#[tauri::command]
async fn get_patterns(state: State<'_, AppState>) -> Result<Vec<PatternDto>, String> {
    let rows = sqlx::query("SELECT id, name, timezone, times_json FROM patterns ORDER BY id ASC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| PatternDto {
            id: r.get("id"),
            name: r.get("name"),
            timezone: r.get("timezone"),
            times_json: r.get("times_json"),
        })
        .collect())
}

#[tauri::command]
async fn get_queue(target_id: i64, state: State<'_, AppState>) -> Result<Vec<PostDto>, String> {
    let rows = sqlx::query(
        "SELECT p.id, p.text, p.scheduled_at_utc, p.status, p.author_name, COUNT(a.id) as att_count 
         FROM posts p 
         LEFT JOIN attachments a ON a.post_id = p.id 
         WHERE p.target_id = ? AND p.status != 'archived' 
         GROUP BY p.id 
         ORDER BY p.scheduled_at_utc ASC"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| PostDto {
            id: r.get("id"),
            text: r.get("text"),
            scheduled_at_utc: r.get("scheduled_at_utc"),
            status: r.get("status"),
            author_name: r.get("author_name"),
            attachments_count: r.get("att_count"),
        })
        .collect())
}

#[tauri::command]
async fn get_next_slot_preview(
    target_id: i64,
    pattern_id: i64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let pattern_row = sqlx::query("SELECT * FROM patterns WHERE id = ?")
        .bind(pattern_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone: pattern_row.get("timezone"),
        times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
        days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
        min_interval_minutes: pattern_row.get("min_interval_minutes"),
    })
    .map_err(|e| e.to_string())?;

    let last_post = sqlx::query(
        "SELECT scheduled_at_utc FROM posts WHERE target_id = ? AND status = 'queued' ORDER BY scheduled_at_utc DESC LIMIT 1"
    )
    .bind(target_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let last_time = last_post.and_then(|r| {
        let s: String = r.get("scheduled_at_utc");
        chrono::DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&chrono::Utc))
    });

    let slot = engine
        .calculate_post_time(chrono::Utc::now(), last_time)
        .map_err(|e| e.to_string())?;

    Ok(slot.to_rfc3339())
}

#[tauri::command]
async fn delete_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE posts SET status = 'archived' WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn add_post_to_queue(
    target_id: i64,
    pattern_id: i64,
    text: String,
    author_name: Option<String>,
    file_paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let db = &state.db;

    let pattern_row = sqlx::query("SELECT * FROM patterns WHERE id = ?")
        .bind(pattern_id)
        .fetch_one(db)
        .await
        .map_err(|e| e.to_string())?;

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone: pattern_row.get("timezone"),
        times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
        days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
        min_interval_minutes: pattern_row.get("min_interval_minutes"),
    })
    .map_err(|e| e.to_string())?;

    let last_post = sqlx::query(
        "SELECT scheduled_at_utc FROM posts WHERE target_id = ? AND status = 'queued' ORDER BY scheduled_at_utc DESC LIMIT 1"
    )
    .bind(target_id)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;

    let last_time = last_post.and_then(|r| {
        let s: String = r.get("scheduled_at_utc");
        chrono::DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&chrono::Utc))
    });

    let scheduled_time = engine
        .calculate_post_time(chrono::Utc::now(), last_time)
        .map_err(|e| e.to_string())?;

    let guid = uuid::Uuid::new_v4().to_string();

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    let post_id = sqlx::query(
        "INSERT INTO posts (account_id, target_id, pattern_id, text, scheduled_at_utc, guid, author_name) 
         VALUES (1, ?, ?, ?, ?, ?, ?) RETURNING id"
    )
    .bind(target_id)
    .bind(pattern_id)
    .bind(&text)
    .bind(scheduled_time.to_rfc3339())
    .bind(&guid)
    .bind(&author_name)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .get::<i64, _>("id");

    for (idx, path_str) in file_paths.iter().enumerate() {
        let p = std::path::Path::new(path_str);
        let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("file");
        let size = std::fs::metadata(p).map(|m| m.len() as i64).unwrap_or(0);

        sqlx::query(
            "INSERT INTO attachments (post_id, local_path, file_name, size_bytes, attachment_kind, order_index)
             VALUES (?, ?, ?, ?, 'photo', ?)"
        )
        .bind(post_id)
        .bind(path_str)
        .bind(name)
        .bind(size)
        .bind(idx as i32)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(post_id)
}

#[tauri::command]
async fn start_transfer_pipeline(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let vk = {
        let guard = state.active_vk.lock().await;
        guard.clone().ok_or("VK токен не установлен")?
    };

    let db = state.db.clone();
    tokio::spawn(async move {
        if let Err(e) = TransferWorker::run_transfer(app, db, vk, target_id).await {
            eprintln!("Transfer worker error: {:?}", e);
        }
    });

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let app_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app_data_dir");
                std::fs::create_dir_all(&app_dir).ok();

                let db_path = app_dir.join("studio.sqlite");
                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect_with(
                        sqlx::sqlite::SqliteConnectOptions::new()
                            .filename(&db_path)
                            .create_if_missing(true),
                    )
                    .await
                    .expect("Failed to connect to SQLite");

                for statement in include_str!("../migrations/001_initial.sql").split(';') {
                    let stmt = statement.trim();
                    if !stmt.is_empty() {
                        sqlx::query(stmt)
                            .execute(&pool)
                            .await
                            .expect("Migration failed");
                    }
                }

                sqlx::query(
                    "INSERT OR IGNORE INTO patterns (id, name, timezone, times_json, days_json, min_interval_minutes, is_default)
                     VALUES (1, '3 поста в день (14:00, 18:00, 21:00)', 'Europe/Moscow', '[\"14:00\", \"18:00\", \"21:00\"]', '[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]', 30, 1)"
                )
                .execute(&pool)
                .await
                .ok();

                app_handle.manage(AppState {
                    db: pool,
                    active_vk: Arc::new(Mutex::new(None)),
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_access_token,
            get_targets,
            get_patterns,
            get_queue,
            get_next_slot_preview,
            delete_post,
            add_post_to_queue,
            start_transfer_pipeline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}