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
                        let _ = sqlx::query(stmt).execute(&pool).await;
                    }
                }

                // Миграция схемы: снятие жесткого CHECK constraint для поддержки статусов published и deleted_in_vk
                let table_sql: Option<String> = sqlx::query_scalar(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name='posts'"
                ).fetch_optional(&pool).await.ok().flatten();

                if let Some(sql) = table_sql {
                    if sql.contains("CHECK") && !sql.contains("'published'") {
                        let _ = sqlx::query("PRAGMA foreign_keys=OFF;").execute(&pool).await;
                        let _ = sqlx::query("ALTER TABLE posts RENAME TO _posts_old;").execute(&pool).await;
                        let _ = sqlx::query(
                            "CREATE TABLE posts (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                account_id INTEGER NOT NULL,
                                target_id INTEGER NOT NULL,
                                pattern_id INTEGER NOT NULL,
                                text TEXT NOT NULL,
                                scheduled_at_utc TEXT NOT NULL,
                                guid TEXT NOT NULL UNIQUE,
                                status TEXT NOT NULL DEFAULT 'queued',
                                vk_post_id INTEGER,
                                signed INTEGER NOT NULL DEFAULT 0,
                                close_comments INTEGER NOT NULL DEFAULT 0,
                                mute_notifications INTEGER NOT NULL DEFAULT 0,
                                mark_as_ads INTEGER NOT NULL DEFAULT 0,
                                attachments_view_mode TEXT NOT NULL DEFAULT 'grid',
                                error_message TEXT,
                                created_at_utc TEXT NOT NULL DEFAULT (datetime('now'))
                            );"
                        ).execute(&pool).await;

                        let _ = sqlx::query(
                            "INSERT INTO posts (id, account_id, target_id, pattern_id, text, scheduled_at_utc, guid, status, vk_post_id, signed, close_comments, mute_notifications, mark_as_ads, attachments_view_mode, error_message, created_at_utc)
                             SELECT id, account_id, target_id, pattern_id, text, scheduled_at_utc, guid, status, vk_post_id, signed, close_comments, mute_notifications, mark_as_ads, attachments_view_mode, error_message, created_at_utc FROM _posts_old;"
                        ).execute(&pool).await;

                        let _ = sqlx::query("DROP TABLE _posts_old;").execute(&pool).await;
                        let _ = sqlx::query("PRAGMA foreign_keys=ON;").execute(&pool).await;
                    }
                }

                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN signed INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN close_comments INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mute_notifications INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mark_as_ads INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN attachments_view_mode TEXT NOT NULL DEFAULT 'grid'").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE patterns ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 1").execute(&pool).await;

                sqlx::query(
                    "INSERT OR IGNORE INTO patterns (id, name, timezone, times_json, days_json, min_interval_minutes, interval_days, is_default)
                     VALUES (1, '3 поста в день (14:00, 18:00, 21:00)', 'Europe/Moscow', '[\"14:00\", \"18:00\", \"21:00\"]', '[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]', 30, 1, 1)"
                )
                .execute(&pool)
                .await
                .ok();

                let active_token = sqlx::query("SELECT token FROM accounts WHERE is_active = 1 LIMIT 1")
                    .fetch_optional(&pool)
                    .await
                    .ok()
                    .flatten()
                    .map(|r| r.get::<String, _>("token"));

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
            commands::post::get_all_posts,
            commands::post::sync_vk_wall_posts,
            commands::post::fetch_vk_post_photos,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}