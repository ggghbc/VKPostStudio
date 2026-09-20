mod commands;
mod services;
mod vk;

use commands::system::make_db_backup;
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use std::sync::Arc;
use tauri::{Manager, WindowEvent};
use tokio::sync::Mutex;
use vk::client::VkClient;

pub struct AppState {
    pub db: SqlitePool,
    pub active_vk: Arc<Mutex<Option<VkClient>>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let _ = make_db_backup(window.app_handle());
            }
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let app_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app_data_dir");
                std::fs::create_dir_all(&app_dir).ok();

                let thumbs_dir = app_dir.join("thumbnails");
                std::fs::create_dir_all(&thumbs_dir).ok();

                let pasted_dir = app_dir.join("pasted_images");
                std::fs::create_dir_all(&pasted_dir).ok();

                let db_path = app_dir.join("studio.sqlite");

                let connect_options = sqlx::sqlite::SqliteConnectOptions::new()
                    .filename(&db_path)
                    .create_if_missing(true)
                    .pragma("foreign_keys", "ON")
                    .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect_with(connect_options)
                    .await
                    .expect("Failed to connect to SQLite");

                for statement in include_str!("../migrations/001_initial.sql").split(';') {
                    let stmt = statement.trim();
                    if !stmt.is_empty() {
                        let _ = sqlx::query(stmt).execute(&pool).await;
                    }
                }

                let att_sql: Option<String> = sqlx::query_scalar(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name='attachments'"
                ).fetch_optional(&pool).await.ok().flatten();

                if let Some(sql) = att_sql {
                    if sql.contains("_posts_old") {
                        let _ = sqlx::query("PRAGMA foreign_keys = OFF;").execute(&pool).await;
                        let _ = sqlx::query("ALTER TABLE attachments RENAME TO _att_broken;").execute(&pool).await;
                        let _ = sqlx::query(
                            "CREATE TABLE attachments (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                post_id INTEGER NOT NULL,
                                file_name TEXT NOT NULL,
                                size_bytes INTEGER NOT NULL,
                                attachment_kind TEXT NOT NULL,
                                upload_status TEXT NOT NULL DEFAULT 'pending',
                                vk_attachment_string TEXT,
                                local_path TEXT,
                                order_index INTEGER NOT NULL DEFAULT 0,
                                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
                            );"
                        ).execute(&pool).await;
                        let _ = sqlx::query("INSERT INTO attachments SELECT * FROM _att_broken;").execute(&pool).await;
                        let _ = sqlx::query("DROP TABLE _att_broken;").execute(&pool).await;
                        let _ = sqlx::query("PRAGMA foreign_keys = ON;").execute(&pool).await;
                    }
                }

                let _ = sqlx::query("DELETE FROM attachments WHERE post_id IN (SELECT id FROM posts WHERE guid LIKE 'vk_ext_%');").execute(&pool).await;
                let _ = sqlx::query("DELETE FROM posts WHERE guid LIKE 'vk_ext_%';").execute(&pool).await;

                // Проверка и добавление отсутствующих колонок в posts
                let post_columns: Vec<String> = sqlx::query("PRAGMA table_info(posts)")
                    .fetch_all(&pool)
                    .await
                    .unwrap_or_default()
                    .into_iter()
                    .map(|r| r.get::<String, _>("name"))
                    .collect();

                if !post_columns.contains(&"signed".to_string()) {
                    let _ = sqlx::query("ALTER TABLE posts ADD COLUMN signed INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                }
                if !post_columns.contains(&"close_comments".to_string()) {
                    let _ = sqlx::query("ALTER TABLE posts ADD COLUMN close_comments INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                }
                if !post_columns.contains(&"mute_notifications".to_string()) {
                    let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mute_notifications INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                }
                if !post_columns.contains(&"mark_as_ads".to_string()) {
                    let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mark_as_ads INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                }
                if !post_columns.contains(&"attachments_view_mode".to_string()) {
                    let _ = sqlx::query("ALTER TABLE posts ADD COLUMN attachments_view_mode TEXT NOT NULL DEFAULT 'grid'").execute(&pool).await;
                }

                let att_columns: Vec<String> = sqlx::query("PRAGMA table_info(attachments)")
                    .fetch_all(&pool)
                    .await
                    .unwrap_or_default()
                    .into_iter()
                    .map(|r| r.get::<String, _>("name"))
                    .collect();

                if !att_columns.contains(&"error_message".to_string()) {
                    let _ = sqlx::query("ALTER TABLE attachments ADD COLUMN error_message TEXT").execute(&pool).await;
                }
                if !att_columns.contains(&"preview_url".to_string()) {
                    let _ = sqlx::query("ALTER TABLE attachments ADD COLUMN preview_url TEXT").execute(&pool).await;
                }

                if !att_columns.contains(&"full_url".to_string()) {
                    let _ = sqlx::query("ALTER TABLE attachments ADD COLUMN full_url TEXT").execute(&pool).await;
                }

                // Проверка и добавление интервала в patterns
                let pat_columns: Vec<String> = sqlx::query("PRAGMA table_info(patterns)")
                    .fetch_all(&pool)
                    .await
                    .unwrap_or_default()
                    .into_iter()
                    .map(|r| r.get::<String, _>("name"))
                    .collect();

                if !pat_columns.contains(&"interval_days".to_string()) {
                    let _ = sqlx::query("ALTER TABLE patterns ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 1").execute(&pool).await;
                }

                // Уникальный индекс для targets, исключающий дубликаты
                let _ = sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_acc_owner ON targets(account_id, owner_id);").execute(&pool).await;

                sqlx::query(
                    "INSERT OR IGNORE INTO patterns (id, name, timezone, times_json, days_json, min_interval_minutes, interval_days, is_default)
                     VALUES (1, '3 поста в день (14:00, 18:00, 21:00)', 'Europe/Moscow', '[\"14:00\", \"18:00\", \"21:00\"]', '[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]', 30, 1, 1)"
                )
                .execute(&pool)
                .await
                .ok();

                let active_row = sqlx::query("SELECT id, token FROM accounts WHERE is_active = 1 LIMIT 1")
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten();

                let active_token = active_row.map(|r| {
                    let acc_id: i64 = r.get("id");
                    let db_tok: String = r.get("token");
                    services::token_vault::TokenVault::get_token(acc_id, &db_tok)
                });

                let vk_client = active_token.map(VkClient::new);

                app_handle.manage(AppState {
                    db: pool,
                    active_vk: Arc::new(Mutex::new(vk_client)),
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::account::open_vk_auth_browser,
            commands::account::get_accounts,
            commands::account::switch_account,
            commands::account::delete_account,
            commands::account::add_token,
            commands::account::clean_expired_tokens,
            commands::account::get_targets,
            commands::pattern::get_patterns,
            commands::pattern::create_pattern,
            commands::pattern::delete_pattern,
            commands::pattern::get_next_slot_preview,
            commands::pattern::reschedule_post_next_slot,
            commands::pattern::reschedule_post_custom,
            commands::post::get_queue,
            commands::post::get_post_history,
            commands::post::fetch_vk_post_photos,
            commands::post::fetch_live_wall_posts,
            commands::post::sync_vk_delayed_posts,
            commands::post::revert_vk_post_to_local_same_time,
            commands::post::revert_vk_post_to_local_next_slot,
            commands::post::delete_local_post,
            commands::post::delete_vk_post,
            commands::post::delete_history_post,
            commands::post::update_post,
            commands::post::clean_uploaded_local_files,
            commands::post::batch_create_posts,
            commands::post::add_post_to_queue,
            commands::post::start_transfer_pipeline,
            commands::system::get_file_preview_base64,
            commands::system::save_pasted_image_bytes,
            commands::system::init_client_timezone,
            commands::system::backup_database,
            commands::system::clear_database_except_tokens,
            commands::system::open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}