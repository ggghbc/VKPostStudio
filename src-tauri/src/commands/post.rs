use crate::commands::pattern::reschedule_post_next_slot;
use crate::commands::system::get_file_preview_base64;
use crate::services::pattern_engine::{PatternConfig, PatternEngine};
use crate::services::transfer_worker::TransferWorker;
use crate::vk::client::VkClient;
use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[derive(Serialize, Deserialize, Clone)]
pub struct AttachmentDto {
    pub id: i64,
    pub file_name: String,
    pub size_bytes: i64,
    pub local_path: Option<String>,
    pub vk_attachment_string: Option<String>,
    pub thumb_data: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PostDto {
    pub id: i64,
    pub text: String,
    pub scheduled_at_utc: String,
    pub status: String,
    pub error_message: Option<String>,
    pub attachments_count: i64,
    pub attachments_view_mode: String,
    pub signed: bool,
    pub close_comments: bool,
    pub mute_notifications: bool,
    pub mark_as_ads: bool,
    pub target_id: i64,
    pub target_title: Option<String>,
    pub attachments: Vec<AttachmentDto>,
}

#[derive(Serialize, Deserialize)]
pub struct SyncResultDto {
    pub posts: Vec<PostDto>,
    pub group_auth_restricted: bool,
}

#[derive(Serialize, Deserialize)]
pub struct UpdateAttachmentInput {
    pub id: Option<i64>,
    pub local_path: Option<String>,
    pub file_name: String,
    pub vk_attachment_string: Option<String>,
    pub thumb_data: Option<String>,
}

fn get_thumbs_dir(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from(".")).join("thumbnails");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn map_post_row(r: &sqlx::sqlite::SqliteRow, attachments: Vec<AttachmentDto>) -> PostDto {
    PostDto {
        id: r.get("id"),
        text: r.get("text"),
        scheduled_at_utc: r.get("scheduled_at_utc"),
        status: r.get("status"),
        error_message: r.get("error_message"),
        attachments_count: attachments.len() as i64,
        attachments_view_mode: r.try_get("attachments_view_mode").unwrap_or_else(|_| "grid".to_string()),
        signed: r.try_get::<i64, _>("signed").unwrap_or(0) == 1,
        close_comments: r.try_get::<i64, _>("close_comments").unwrap_or(0) == 1,
        mute_notifications: r.try_get::<i64, _>("mute_notifications").unwrap_or(0) == 1,
        mark_as_ads: r.try_get::<i64, _>("mark_as_ads").unwrap_or(0) == 1,
        target_id: r.try_get("target_id").unwrap_or(0),
        target_title: r.try_get("target_title").ok(),
        attachments,
    }
}

async fn get_attachments_for_post(db: &sqlx::SqlitePool, post_id: i64, thumbs_dir: &PathBuf) -> Vec<AttachmentDto> {
    let att_rows = sqlx::query(
        "SELECT id, file_name, size_bytes, local_path, vk_attachment_string 
         FROM attachments WHERE post_id = ? ORDER BY order_index ASC"
    )
    .bind(post_id)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let mut attachments = Vec::new();
    for a in att_rows {
        let att_id: i64 = a.get("id");
        let local_path: Option<String> = a.get("local_path");
        let thumb_path = thumbs_dir.join(format!("{}.thumb", att_id));
        let thumb_data = if thumb_path.exists() {
            std::fs::read_to_string(&thumb_path).ok()
        } else if let Some(ref lp) = local_path {
            let p = PathBuf::from(lp);
            if p.exists() { get_file_preview_base64(lp.clone()).await.ok() } else { None }
        } else {
            None
        };

        attachments.push(AttachmentDto {
            id: att_id,
            file_name: a.get("file_name"),
            size_bytes: a.get("size_bytes"),
            local_path,
            vk_attachment_string: a.get("vk_attachment_string"),
            thumb_data,
        });
    }
    attachments
}

#[tauri::command]
pub async fn get_queue(target_id: i64, app: AppHandle, state: State<'_, AppState>) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT p.id, p.target_id, t.title as target_title, p.text, p.scheduled_at_utc, p.status, p.error_message, p.attachments_view_mode,
                p.signed, p.close_comments, p.mute_notifications, p.mark_as_ads 
         FROM posts p
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?) AND p.status != 'archived' 
         ORDER BY datetime(p.scheduled_at_utc) ASC"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let thumbs_dir = get_thumbs_dir(&app);
    let mut result = Vec::new();

    for r in posts_rows {
        let post_id: i64 = r.get("id");
        let attachments = get_attachments_for_post(&state.db, post_id, &thumbs_dir).await;
        result.push(map_post_row(&r, attachments));
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_post_history(target_id: i64, app: AppHandle, state: State<'_, AppState>) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT p.id, p.target_id, t.title as target_title, p.text, p.scheduled_at_utc, p.status, p.error_message, p.attachments_view_mode,
                p.signed, p.close_comments, p.mute_notifications, p.mark_as_ads 
         FROM posts p
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
         ORDER BY datetime(p.scheduled_at_utc) ASC"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let thumbs_dir = get_thumbs_dir(&app);
    let mut result = Vec::new();

    for r in posts_rows {
        let post_id: i64 = r.get("id");
        let attachments = get_attachments_for_post(&state.db, post_id, &thumbs_dir).await;
        result.push(map_post_row(&r, attachments));
    }

    Ok(result)
}

// Запрос ВСЕХ постов приложения со всех сообществ с информацией о цели
#[tauri::command]
pub async fn get_all_posts(app: AppHandle, state: State<'_, AppState>) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT p.id, p.target_id, COALESCE(t.title, 'Неизвестная цель') as target_title, 
                p.text, p.scheduled_at_utc, p.status, p.error_message, p.attachments_view_mode,
                p.signed, p.close_comments, p.mute_notifications, p.mark_as_ads 
         FROM posts p
         LEFT JOIN targets t ON p.target_id = t.id
         ORDER BY p.id DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let thumbs_dir = get_thumbs_dir(&app);
    let mut result = Vec::new();

    for r in posts_rows {
        let post_id: i64 = r.get("id");
        let attachments = get_attachments_for_post(&state.db, post_id, &thumbs_dir).await;
        result.push(map_post_row(&r, attachments));
    }

    Ok(result)
}

#[tauri::command]
pub async fn sync_vk_delayed_posts(target_id: i64, app: AppHandle, state: State<'_, AppState>) -> Result<SyncResultDto, String> {
    let target_row = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?")
        .bind(target_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let account_id: i64 = target_row.get("account_id");
    let owner_id: i64 = target_row.get("owner_id");

    let token_row = sqlx::query("SELECT token FROM accounts WHERE id = ?")
        .bind(account_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let token: String = token_row.get("token");
    let vk = VkClient::new(token);

    let mut group_auth_restricted = false;

    match vk.get_postponed_posts(owner_id).await {
        Ok(vk_posts) => {
            let mut vk_post_ids = Vec::new();

            for item in &vk_posts {
                vk_post_ids.push(item.id);
                let sched_dt = chrono::DateTime::from_timestamp(item.date, 0)
                    .unwrap_or_else(chrono::Utc::now)
                    .to_rfc3339();
                let text = item.text.clone().unwrap_or_default();

                let existing = sqlx::query("SELECT id FROM posts WHERE target_id = ? AND vk_post_id = ?")
                    .bind(target_id)
                    .bind(item.id)
                    .fetch_optional(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;

                if let Some(row) = existing {
                    let pid: i64 = row.get("id");
                    sqlx::query("UPDATE posts SET scheduled_at_utc = ?, text = ?, status = 'transferred_to_vk' WHERE id = ?")
                        .bind(&sched_dt)
                        .bind(&text)
                        .bind(pid)
                        .execute(&state.db)
                        .await
                        .map_err(|e| e.to_string())?;
                } else {
                    let guid = uuid::Uuid::new_v4().to_string();
                    let new_pid = sqlx::query(
                        "INSERT INTO posts (
                            account_id, target_id, pattern_id, text, scheduled_at_utc, guid,
                            status, vk_post_id, signed, close_comments, mute_notifications, mark_as_ads, attachments_view_mode
                        ) VALUES (
                            ?, ?, COALESCE((SELECT id FROM patterns ORDER BY id ASC LIMIT 1), 1), ?, ?, ?,
                            'transferred_to_vk', ?, 0, 0, 0, 0, 'grid'
                        ) RETURNING id"
                    )
                    .bind(account_id)
                    .bind(target_id)
                    .bind(&text)
                    .bind(&sched_dt)
                    .bind(&guid)
                    .bind(item.id)
                    .fetch_one(&state.db)
                    .await
                    .map_err(|e| e.to_string())?
                    .get::<i64, _>("id");

                    for i in 0..item.attachments_count {
                        sqlx::query(
                            "INSERT INTO attachments (post_id, file_name, size_bytes, attachment_kind, upload_status, order_index)
                             VALUES (?, 'vk_media', 0, 'photo', 'uploaded', ?)"
                        )
                        .bind(new_pid)
                        .bind(i as i32)
                        .execute(&state.db)
                        .await
                        .ok();
                    }
                }
            }

            let local_scheduled = sqlx::query(
                "SELECT id, vk_post_id FROM posts 
                 WHERE target_id = ? AND status = 'transferred_to_vk' 
                   AND vk_post_id IS NOT NULL"
            )
            .bind(target_id)
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?;

            for row in local_scheduled {
                let pid: i64 = row.get("id");
                let vk_id: i64 = row.get("vk_post_id");
                if !vk_post_ids.contains(&vk_id) {
                    sqlx::query("UPDATE posts SET status = 'archived' WHERE id = ?")
                        .bind(pid)
                        .execute(&state.db)
                        .await
                        .map_err(|e| e.to_string())?;
                }
            }
        }
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("error 27") || err_str.contains("unavailable with group auth") {
                group_auth_restricted = true;
            } else {
                return Err(err_str);
            }
        }
    }

    let posts = get_queue(target_id, app, state).await?;
    Ok(SyncResultDto {
        posts,
        group_auth_restricted,
    })
}

#[tauri::command]
pub async fn revert_vk_post_to_local_same_time(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let post = sqlx::query("SELECT target_id, vk_post_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(p) = post {
        let target_id: i64 = p.get("target_id");
        let vk_post_id: Option<i64> = p.get("vk_post_id");

        if let Some(vk_id) = vk_post_id {
            if let Ok(t_row) = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?").bind(target_id).fetch_one(&state.db).await {
                let account_id: i64 = t_row.get("account_id");
                let owner_id: i64 = t_row.get("owner_id");
                if let Ok(acc) = sqlx::query("SELECT token FROM accounts WHERE id = ?").bind(account_id).fetch_one(&state.db).await {
                    let token: String = acc.get("token");
                    let vk = VkClient::new(token);
                    let _ = vk.delete_wall_post(owner_id, vk_id).await;
                }
            }
        }
    }

    sqlx::query("UPDATE posts SET status = 'queued', vk_post_id = NULL, error_message = NULL WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn revert_vk_post_to_local_next_slot(post_id: i64, pattern_id: i64, state: State<'_, AppState>) -> Result<String, String> {
    let post = sqlx::query("SELECT target_id, vk_post_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(ref p) = post {
        let target_id: i64 = p.get("target_id");
        let vk_post_id: Option<i64> = p.get("vk_post_id");

        if let Some(vk_id) = vk_post_id {
            if let Ok(t_row) = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?").bind(target_id).fetch_one(&state.db).await {
                let account_id: i64 = t_row.get("account_id");
                let owner_id: i64 = t_row.get("owner_id");
                if let Ok(acc) = sqlx::query("SELECT token FROM accounts WHERE id = ?").bind(account_id).fetch_one(&state.db).await {
                    let token: String = acc.get("token");
                    let vk = VkClient::new(token);
                    let _ = vk.delete_wall_post(owner_id, vk_id).await;
                }
            }
        }
    }

    let slot = reschedule_post_next_slot(post_id, pattern_id, state.clone()).await?;

    sqlx::query("UPDATE posts SET vk_post_id = NULL, error_message = NULL WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(slot)
}

#[tauri::command]
pub async fn delete_local_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE posts SET status = 'archived' WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_vk_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let post = sqlx::query("SELECT target_id, vk_post_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(p) = post {
        let target_id: i64 = p.get("target_id");
        let vk_post_id: Option<i64> = p.get("vk_post_id");

        if let Some(vk_id) = vk_post_id {
            if let Ok(t_row) = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?").bind(target_id).fetch_one(&state.db).await {
                let account_id: i64 = t_row.get("account_id");
                let owner_id: i64 = t_row.get("owner_id");
                if let Ok(acc) = sqlx::query("SELECT token FROM accounts WHERE id = ?").bind(account_id).fetch_one(&state.db).await {
                    let token: String = acc.get("token");
                    let vk = VkClient::new(token);
                    let _ = vk.delete_wall_post(owner_id, vk_id).await;
                }
            }
        }
    }

    sqlx::query("UPDATE posts SET status = 'archived' WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_history_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM attachments WHERE post_id = ?").bind(post_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM posts WHERE id = ?").bind(post_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// Обновление поста с точной синхронизацией вложений
#[tauri::command]
pub async fn update_post(
    post_id: i64,
    text: String,
    signed: bool,
    close_comments: bool,
    mute_notifications: bool,
    mark_as_ads: bool,
    attachments_view_mode: String,
    attachments: Vec<UpdateAttachmentInput>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE posts SET text = ?, signed = ?, close_comments = ?, mute_notifications = ?, mark_as_ads = ?, attachments_view_mode = ? WHERE id = ?"
    )
    .bind(&text)
    .bind(if signed { 1 } else { 0 })
    .bind(if close_comments { 1 } else { 0 })
    .bind(if mute_notifications { 1 } else { 0 })
    .bind(if mark_as_ads { 1 } else { 0 })
    .bind(&attachments_view_mode)
    .bind(post_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Всегда полностью очищаем старые вложения и сохраняем актуальный набор из редактора
    sqlx::query("DELETE FROM attachments WHERE post_id = ?")
        .bind(post_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let thumbs_dir = get_thumbs_dir(&app);

    for (idx, att) in attachments.iter().enumerate() {
        let is_uploaded = att.vk_attachment_string.is_some();
        let upload_status = if is_uploaded { "uploaded" } else { "pending" };

        let att_id = sqlx::query(
            "INSERT INTO attachments (post_id, local_path, file_name, size_bytes, attachment_kind, upload_status, vk_attachment_string, order_index)
             VALUES (?, ?, ?, 0, 'photo', ?, ?, ?) RETURNING id"
        )
        .bind(post_id)
        .bind(&att.local_path)
        .bind(&att.file_name)
        .bind(upload_status)
        .bind(&att.vk_attachment_string)
        .bind(idx as i32)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get::<i64, _>("id");

        let thumb_path = thumbs_dir.join(format!("{}.thumb", att_id));
        if let Some(ref b64) = att.thumb_data {
            let _ = std::fs::write(&thumb_path, b64);
        } else if let Some(ref lp) = att.local_path {
            if let Ok(b64) = get_file_preview_base64(lp.clone()).await {
                let _ = std::fs::write(&thumb_path, b64);
            }
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn clean_uploaded_local_files(target_id: i64, state: State<'_, AppState>) -> Result<i64, String> {
    let rows = sqlx::query(
        "SELECT a.id, a.local_path 
         FROM attachments a 
         JOIN posts p ON a.post_id = p.id 
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
           AND p.status = 'transferred_to_vk' 
           AND a.local_path IS NOT NULL"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let mut deleted_count = 0;
    for r in rows {
        let att_id: i64 = r.get("id");
        let path_str: String = r.get("local_path");
        let path = std::path::Path::new(&path_str);
        if path.exists() {
            if let Ok(_) = tokio::fs::remove_file(path).await {
                deleted_count += 1;
            }
        }
        let _ = sqlx::query("UPDATE attachments SET local_path = NULL WHERE id = ?").bind(att_id).execute(&state.db).await;
    }

    Ok(deleted_count)
}

#[tauri::command]
pub async fn batch_create_posts(
    target_id: i64,
    pattern_id: i64,
    file_paths: Vec<String>,
    items_per_post: usize,
    text: String,
    signed: bool,
    close_comments: bool,
    mute_notifications: bool,
    mark_as_ads: bool,
    attachments_view_mode: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    if file_paths.is_empty() || items_per_post == 0 {
        return Ok(0);
    }

    let chunks: Vec<Vec<String>> = file_paths.chunks(items_per_post).map(|c| c.to_vec()).collect();
    let total_posts = chunks.len();

    for chunk in chunks {
        let _ = add_post_to_queue(
            target_id,
            pattern_id,
            text.clone(),
            signed,
            close_comments,
            mute_notifications,
            mark_as_ads,
            attachments_view_mode.clone(),
            None,
            chunk,
            app.clone(),
            state.clone(),
        )
        .await?;
    }

    Ok(total_posts)
}

#[tauri::command]
pub async fn add_post_to_queue(
    target_id: i64,
    pattern_id: i64,
    text: String,
    signed: bool,
    close_comments: bool,
    mute_notifications: bool,
    mark_as_ads: bool,
    attachments_view_mode: String,
    custom_scheduled_at: Option<String>,
    file_paths: Vec<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let db = &state.db;

    let target_row = sqlx::query("SELECT account_id FROM targets WHERE id = ?")
        .bind(target_id)
        .fetch_one(db)
        .await
        .map_err(|e| format!("Цель не найдена: {}", e))?;
    let account_id: i64 = target_row.get("account_id");

    let scheduled_time = if let Some(ref custom_str) = custom_scheduled_at {
        chrono::DateTime::parse_from_rfc3339(custom_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .map_err(|e| format!("Неверный формат времени: {}", e))?
    } else {
        let pattern_opt = sqlx::query("SELECT * FROM patterns WHERE id = ?")
            .bind(pattern_id)
            .fetch_optional(db)
            .await
            .map_err(|e| e.to_string())?;

        let pattern_row = match pattern_opt {
            Some(row) => row,
            None => sqlx::query("SELECT * FROM patterns ORDER BY id ASC LIMIT 1")
                .fetch_one(db)
                .await
                .map_err(|e| e.to_string())?,
        };

        let interval_days: i64 = pattern_row.try_get("interval_days").unwrap_or(1);

        let engine = PatternEngine::from_config(&PatternConfig {
            timezone: pattern_row.get("timezone"),
            times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
            days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
            min_interval_minutes: pattern_row.try_get("min_interval_minutes").unwrap_or(30),
            interval_days: Some(interval_days),
        })
        .map_err(|e| e.to_string())?;

        let last_post = sqlx::query(
            "SELECT p.scheduled_at_utc FROM posts p
             JOIN targets t ON p.target_id = t.id
             WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
               AND p.status IN ('queued', 'transferred_to_vk')
             ORDER BY datetime(p.scheduled_at_utc) DESC LIMIT 1"
        )
        .bind(target_id)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

        let last_time = last_post.and_then(|r| {
            let s: String = r.get("scheduled_at_utc");
            chrono::DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&chrono::Utc))
        });

        engine.calculate_post_time(chrono::Utc::now(), last_time).map_err(|e| e.to_string())?
    };

    let guid = uuid::Uuid::new_v4().to_string();
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    let post_id = sqlx::query(
        "INSERT INTO posts (
            account_id, target_id, pattern_id, text, scheduled_at_utc, guid,
            signed, close_comments, mute_notifications, mark_as_ads, attachments_view_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
    )
    .bind(account_id)
    .bind(target_id)
    .bind(pattern_id)
    .bind(&text)
    .bind(scheduled_time.to_rfc3339())
    .bind(&guid)
    .bind(if signed { 1 } else { 0 })
    .bind(if close_comments { 1 } else { 0 })
    .bind(if mute_notifications { 1 } else { 0 })
    .bind(if mark_as_ads { 1 } else { 0 })
    .bind(&attachments_view_mode)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .get::<i64, _>("id");

    let thumbs_dir = get_thumbs_dir(&app);

    for (idx, path_str) in file_paths.iter().enumerate() {
        let p = std::path::Path::new(path_str);
        let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("file");
        let size = std::fs::metadata(p).map(|m| m.len() as i64).unwrap_or(0);

        let att_id = sqlx::query(
            "INSERT INTO attachments (post_id, local_path, file_name, size_bytes, attachment_kind, order_index)
             VALUES (?, ?, ?, ?, 'photo', ?) RETURNING id"
        )
        .bind(post_id)
        .bind(path_str)
        .bind(name)
        .bind(size)
        .bind(idx as i32)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get::<i64, _>("id");

        if let Ok(b64) = get_file_preview_base64(path_str.clone()).await {
            let thumb_path = thumbs_dir.join(format!("{}.thumb", att_id));
            let _ = std::fs::write(&thumb_path, b64);
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(post_id)
}

#[tauri::command]
pub async fn start_transfer_pipeline(target_id: i64, app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let token_row = sqlx::query(
        "SELECT a.token FROM accounts a JOIN targets t ON t.account_id = a.id WHERE t.id = ?"
    )
    .bind(target_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Не найден токен для выбранной цели".to_string())?;

    let token: String = token_row.get("token");
    let vk = VkClient::new(token);

    let db = state.db.clone();
    tokio::spawn(async move {
        if let Err(e) = TransferWorker::run_transfer(app, db, vk, target_id).await {
            eprintln!("Transfer worker error: {:?}", e);
        }
    });

    Ok(())
}