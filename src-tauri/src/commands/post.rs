use crate::commands::pattern::reschedule_post_next_slot;
use crate::commands::system::get_file_preview_base64;
use crate::services::pattern_engine::{PatternConfig, PatternEngine};
use crate::services::token_vault::TokenVault;
use crate::services::transfer_worker::TransferWorker;
use crate::vk::client::VkClient;
use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::hash_map::DefaultHasher;
use std::hash::Hasher;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

#[derive(Serialize, Deserialize, Clone)]
pub struct AttachmentDto {
    pub id: i64,
    pub file_name: String,
    pub size_bytes: i64,
    pub local_path: Option<String>,
    pub vk_attachment_string: Option<String>,
    pub thumb_data: Option<String>,
    pub preview_url: Option<String>,
    pub full_url: Option<String>,
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
    pub vk_post_id: Option<i64>,
    pub target_title: Option<String>,
    pub is_app_created: bool,
    pub attachments: Vec<AttachmentDto>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LiveWallPostDto {
    pub vk_post_id: i64,
    pub date_utc: String,
    pub text: String,
    pub attachments_count: i64,
    pub app_post_id: Option<i64>,
    pub preview_urls: Vec<String>,
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

#[derive(Serialize, Deserialize)]
pub struct DownloadedVkPhotoDto {
    pub file_name: String,
    pub data_url: String,
}

fn compute_file_hash(bytes: &[u8]) -> String {
    let mut hasher = DefaultHasher::new();
    hasher.write(bytes);
    format!("{:016x}_{}", hasher.finish(), bytes.len())
}

fn get_thumbs_dir(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("thumbnails");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn map_post_row(r: &sqlx::sqlite::SqliteRow, attachments: Vec<AttachmentDto>) -> PostDto {
    let guid: String = r.try_get("guid").unwrap_or_default();
    let is_app_created = !guid.starts_with("vk_ext_");

    PostDto {
        id: r.try_get::<i64, _>("id").unwrap_or(0),
        text: r.try_get::<String, _>("text").unwrap_or_default(),
        scheduled_at_utc: r
            .try_get::<String, _>("scheduled_at_utc")
            .unwrap_or_default(),
        status: r
            .try_get::<String, _>("status")
            .unwrap_or_else(|_| "queued".to_string()),
        error_message: r.try_get::<Option<String>, _>("error_message").unwrap_or(None),
        attachments_count: attachments.len() as i64,
        attachments_view_mode: r
            .try_get::<String, _>("attachments_view_mode")
            .unwrap_or_else(|_| "grid".to_string()),
        signed: r.try_get::<i64, _>("signed").unwrap_or(0) == 1,
        close_comments: r.try_get::<i64, _>("close_comments").unwrap_or(0) == 1,
        mute_notifications: r.try_get::<i64, _>("mute_notifications").unwrap_or(0) == 1,
        mark_as_ads: r.try_get::<i64, _>("mark_as_ads").unwrap_or(0) == 1,
        target_id: r.try_get::<i64, _>("target_id").unwrap_or(0),
        vk_post_id: r.try_get::<Option<i64>, _>("vk_post_id").unwrap_or(None),
        target_title: r.try_get::<Option<String>, _>("target_title").unwrap_or(None),
        is_app_created,
        attachments,
    }
}

async fn get_attachments_for_post(
    db: &sqlx::SqlitePool,
    post_id: i64,
    thumbs_dir: &PathBuf,
) -> Vec<AttachmentDto> {
    let att_rows = sqlx::query(
        "SELECT id, file_name, size_bytes, local_path, original_path, vk_attachment_string, preview_url, full_url, order_index 
         FROM attachments WHERE post_id = ? ORDER BY order_index ASC",
    )
    .bind(post_id)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let mut attachments = Vec::new();
    for a in att_rows {
        let att_id: i64 = a.get("id");
        let local_path: Option<String> = a.get("local_path");
        let original_path: Option<String> = a.try_get("original_path").ok().flatten();
        let raw_name: String = a
            .try_get("file_name")
            .unwrap_or_else(|_| "файл".to_string());

        let preview_url: Option<String> = a
            .try_get("preview_url")
            .ok()
            .filter(|s: &String| !s.trim().is_empty());
        let full_url: Option<String> = a
            .try_get("full_url")
            .ok()
            .filter(|s: &String| !s.trim().is_empty());

        let file_name = if raw_name == "vk_media" {
            let idx: i64 = a.try_get("order_index").unwrap_or(0);
            format!("Фото ВКонтакте #{}", idx + 1)
        } else {
            raw_name.clone()
        };

        let effective_path = local_path.clone().or(original_path);

        let thumb_data = if preview_url.is_some() {
            None
        } else {
            let thumb_path = thumbs_dir.join(format!("{}.thumb", att_id));
            if thumb_path.exists() && raw_name != "vk_media" {
                tokio::fs::read_to_string(&thumb_path).await.ok()
            } else if let Some(ref lp) = effective_path {
                let p = PathBuf::from(lp);
                if p.exists() {
                    let b64 = get_file_preview_base64(lp.clone()).await.ok();
                    if let Some(ref data) = b64 {
                        let _ = tokio::fs::write(&thumb_path, data).await;
                    }
                    b64
                } else {
                    None
                }
            } else {
                None
            }
        };

        attachments.push(AttachmentDto {
            id: att_id,
            file_name,
            size_bytes: a.try_get("size_bytes").unwrap_or(0),
            local_path: effective_path,
            vk_attachment_string: a.try_get("vk_attachment_string").ok(),
            thumb_data,
            preview_url,
            full_url,
        });
    }
    attachments
}

pub async fn clean_post_disk_assets(post_id: i64, app: &AppHandle, db: &sqlx::SqlitePool) {
    if let Ok(app_dir) = app.path().app_data_dir() {
        let thumbs_dir = app_dir.join("thumbnails");
        let att_rows = sqlx::query("SELECT id, local_path FROM attachments WHERE post_id = ?")
            .bind(post_id)
            .fetch_all(db)
            .await
            .unwrap_or_default();

        for a in att_rows {
            let att_id: i64 = a.get("id");
            let thumb_path = thumbs_dir.join(format!("{}.thumb", att_id));
            let _ = tokio::fs::remove_file(thumb_path).await;

            let local_path: Option<String> = a.get("local_path");
            if let Some(lp) = local_path {
                if lp.contains("pasted_images") || lp.contains("media") {
                    let _ = tokio::fs::remove_file(PathBuf::from(&lp)).await;
                }
            }
        }
    }
}

#[tauri::command]
pub async fn get_queue(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT p.id, p.target_id, t.title as target_title, p.text, p.scheduled_at_utc, p.status, p.error_message, p.attachments_view_mode,
                p.signed, p.close_comments, p.mute_notifications, p.mark_as_ads, p.vk_post_id, p.guid 
         FROM posts p
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?) 
           AND p.status IN ('queued', 'failed', 'transferred_to_vk') 
         ORDER BY datetime(p.scheduled_at_utc) ASC",
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
pub async fn get_post_history(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT p.id, p.target_id, t.title as target_title, p.text, p.scheduled_at_utc, p.status, p.error_message, p.attachments_view_mode,
                p.signed, p.close_comments, p.mute_notifications, p.mark_as_ads, p.vk_post_id, p.guid 
         FROM posts p
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
         ORDER BY datetime(p.scheduled_at_utc) DESC",
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
pub async fn fetch_live_wall_posts(
    target_id: i64,
    offset: u32,
    state: State<'_, AppState>,
) -> Result<Vec<LiveWallPostDto>, String> {
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

    let db_token: String = token_row.get("token");
    let token = TokenVault::get_token(account_id, &db_token);
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.vk.com/method/wall.get?access_token={}&v=5.131&owner_id={}&filter=owner&count=30&offset={}&photo_sizes=1",
        token, owner_id, offset
    );

    let res_val: serde_json::Value = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err_obj) = res_val.get("error") {
        let code = err_obj.get("error_code").and_then(|v| v.as_i64()).unwrap_or(0);
        let msg = err_obj
            .get("error_msg")
            .and_then(|v| v.as_str())
            .unwrap_or("Неизвестная ошибка VK API");
        return Err(format!("VK API error {}: {}", code, msg));
    }

    let items_arr = res_val
        .get("response")
        .and_then(|r| r.get("items"))
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Некорректный ответ от серверов VK".to_string())?;

    let mut result = Vec::new();

    for item in items_arr {
        let vk_post_id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
        let date = item.get("date").and_then(|v| v.as_i64()).unwrap_or(0);
        let text = item
            .get("text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if vk_post_id <= 0 || date <= 0 {
            continue;
        }

        let date_utc = chrono::DateTime::from_timestamp(date, 0)
            .unwrap_or_else(chrono::Utc::now)
            .to_rfc3339();

        let mut preview_urls = Vec::new();
        if let Some(atts) = item.get("attachments").and_then(|v| v.as_array()) {
            for att in atts {
                if att.get("type").and_then(|v| v.as_str()) == Some("photo") {
                    if let Some(photo) = att.get("photo") {
                        let mut p_url = String::new();
                        if let Some(sizes) = photo.get("sizes").and_then(|v| v.as_array()) {
                            p_url = sizes
                                .iter()
                                .find(|s| {
                                    matches!(s.get("type").and_then(|v| v.as_str()), Some("x" | "y" | "z" | "m"))
                                })
                                .or_else(|| sizes.last())
                                .and_then(|s| s.get("url").or_else(|| s.get("src")))
                                .and_then(|u| u.as_str())
                                .unwrap_or("")
                                .to_string();
                        }
                        if p_url.is_empty() {
                            for key in &["photo_604", "photo_807", "photo_1280", "photo_130"] {
                                if let Some(u) = photo.get(*key).and_then(|v| v.as_str()) {
                                    p_url = u.to_string();
                                    break;
                                }
                            }
                        }
                        if !p_url.is_empty() {
                            preview_urls.push(p_url);
                        }
                    }
                }
            }
        }

        let app_post_id: Option<i64> = sqlx::query_scalar(
            "SELECT id FROM posts WHERE vk_post_id = ? AND target_id = ? LIMIT 1",
        )
        .bind(vk_post_id)
        .bind(target_id)
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten();

        result.push(LiveWallPostDto {
            vk_post_id,
            date_utc,
            text,
            attachments_count: preview_urls.len() as i64,
            app_post_id,
            preview_urls,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn fetch_vk_post_photos(
    target_id: i64,
    vk_post_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<DownloadedVkPhotoDto>, String> {
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

    let db_token: String = token_row.get("token");
    let token = TokenVault::get_token(account_id, &db_token);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    let post_query = format!("{}_{}", owner_id, vk_post_id);

    let request_url = format!(
        "https://api.vk.com/method/wall.getById?access_token={}&v=5.131&posts={}",
        token, post_query
    );

    let res_val: serde_json::Value = client
        .get(&request_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(err_obj) = res_val.get("error") {
        let code = err_obj.get("error_code").and_then(|v| v.as_i64()).unwrap_or(0);
        let msg = err_obj
            .get("error_msg")
            .and_then(|v| v.as_str())
            .unwrap_or("Неизвестная ошибка VK API");
        return Err(format!("VK API error {}: {}", code, msg));
    }

    let posts_arr = res_val
        .get("response")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Некорректный ответ от серверов VK".to_string())?;

    let post_obj = posts_arr
        .first()
        .ok_or_else(|| "Пост не найден в ВК".to_string())?;
    let attachments = post_obj
        .get("attachments")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut result = Vec::new();

    for (idx, att) in attachments.iter().enumerate() {
        if att.get("type").and_then(|v| v.as_str()) == Some("photo") {
            if let Some(photo) = att.get("photo") {
                if let Some(sizes) = photo.get("sizes").and_then(|v| v.as_array()) {
                    if let Some(best_size) = sizes.last() {
                        if let Some(url_str) = best_size.get("url").and_then(|v| v.as_str()) {
                            if let Ok(resp) = client.get(url_str).send().await {
                                if let Ok(bytes) = resp.bytes().await {
                                    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                                    let mut b64 = String::with_capacity((bytes.len() + 2) / 3 * 4);
                                    for chunk in bytes.chunks(3) {
                                        let b0 = chunk[0] as usize;
                                        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
                                        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;
                                        let triple = (b0 << 16) | (b1 << 8) | b2;
                                        b64.push(CHARSET[(triple >> 18) & 0x3F] as char);
                                        b64.push(CHARSET[(triple >> 12) & 0x3F] as char);
                                        if chunk.len() > 1 {
                                            b64.push(CHARSET[(triple >> 6) & 0x3F] as char);
                                        } else {
                                            b64.push('=');
                                        }
                                        if chunk.len() > 2 {
                                            b64.push(CHARSET[triple & 0x3F] as char);
                                        } else {
                                            b64.push('=');
                                        }
                                    }

                                    result.push(DownloadedVkPhotoDto {
                                        file_name: format!("Фото ВК #{}", idx + 1),
                                        data_url: format!("data:image/jpeg;base64,{}", b64),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(result)
}

// Надежная синхронизация: ссылки обновляются, а local_path и original_path НИКОГДА не затираются
#[tauri::command]
pub async fn sync_vk_delayed_posts(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<SyncResultDto, String> {
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

    let db_token: String = token_row.get("token");
    let token = TokenVault::get_token(account_id, &db_token);
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

                let existing = sqlx::query(
                    "SELECT id FROM posts WHERE target_id = ? AND vk_post_id = ?",
                )
                .bind(target_id)
                .bind(item.id)
                .fetch_optional(&state.db)
                .await
                .map_err(|e| e.to_string())?;

                if let Some(row) = existing {
                    let pid: i64 = row.get("id");
                    sqlx::query(
                        "UPDATE posts SET scheduled_at_utc = ?, text = ?, status = 'transferred_to_vk' WHERE id = ?",
                    )
                    .bind(&sched_dt)
                    .bind(&text)
                    .bind(pid)
                    .execute(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;

                    let existing_att_count: i64 = sqlx::query_scalar(
                        "SELECT COUNT(*) FROM attachments WHERE post_id = ?",
                    )
                    .bind(pid)
                    .fetch_one(&state.db)
                    .await
                    .unwrap_or(0);

                    if existing_att_count == 0 {
                        for (i, photo) in item.photos.iter().enumerate() {
                            let vk_str = format!("photo{}_{}", photo.owner_id, photo.id);
                            let _ = sqlx::query(
                                "INSERT INTO attachments (post_id, file_name, size_bytes, attachment_kind, upload_status, order_index, vk_attachment_string, preview_url, full_url)
                                 VALUES (?, 'vk_media', 0, 'photo', 'uploaded', ?, ?, ?, ?)",
                            )
                            .bind(pid)
                            .bind(i as i32)
                            .bind(&vk_str)
                            .bind(&photo.preview_url)
                            .bind(&photo.full_url)
                            .execute(&state.db)
                            .await;
                        }
                    } else {
                        // Обновляем ссылки ВК без удаления local_path и original_path
                        for (i, photo) in item.photos.iter().enumerate() {
                            let vk_str = format!("photo{}_{}", photo.owner_id, photo.id);
                            let _ = sqlx::query(
                                "UPDATE attachments SET 
                                    vk_attachment_string = COALESCE(?, vk_attachment_string),
                                    preview_url = COALESCE(?, preview_url),
                                    full_url = COALESCE(?, full_url)
                                 WHERE post_id = ? AND order_index = ?",
                            )
                            .bind(&vk_str)
                            .bind(&photo.preview_url)
                            .bind(&photo.full_url)
                            .bind(pid)
                            .bind(i as i32)
                            .execute(&state.db)
                            .await;
                        }
                    }
                } else {
                    let guid = format!("vk_ext_{}_{}", owner_id, item.id);
                    let new_pid = sqlx::query(
                        "INSERT INTO posts (
                            account_id, target_id, pattern_id, text, scheduled_at_utc, guid,
                            status, vk_post_id, signed, close_comments, mute_notifications, mark_as_ads, attachments_view_mode
                        ) VALUES (
                            ?, ?, COALESCE((SELECT id FROM patterns ORDER BY id ASC LIMIT 1), 1), ?, ?, ?,
                            'transferred_to_vk', ?, 0, 0, 0, 0, 'grid'
                        ) RETURNING id",
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

                    if !item.photos.is_empty() {
                        for (i, photo) in item.photos.iter().enumerate() {
                            let vk_str = format!("photo{}_{}", photo.owner_id, photo.id);
                            let _ = sqlx::query(
                                "INSERT INTO attachments (post_id, file_name, size_bytes, attachment_kind, upload_status, order_index, vk_attachment_string, preview_url, full_url)
                                 VALUES (?, 'vk_media', 0, 'photo', 'uploaded', ?, ?, ?, ?)",
                            )
                            .bind(new_pid)
                            .bind(i as i32)
                            .bind(&vk_str)
                            .bind(&photo.preview_url)
                            .bind(&photo.full_url)
                            .execute(&state.db)
                            .await;
                        }
                    } else {
                        for i in 0..item.attachments_count {
                            let _ = sqlx::query(
                                "INSERT INTO attachments (post_id, file_name, size_bytes, attachment_kind, upload_status, order_index)
                                 VALUES (?, 'vk_media', 0, 'photo', 'uploaded', ?)",
                            )
                            .bind(new_pid)
                            .bind(i as i32)
                            .execute(&state.db)
                            .await;
                        }
                    }
                }
            }

            let local_scheduled = sqlx::query(
                "SELECT p.id, p.vk_post_id, p.scheduled_at_utc 
                 FROM posts p 
                 JOIN targets t ON p.target_id = t.id
                 WHERE t.owner_id = ? AND p.status = 'transferred_to_vk' 
                   AND p.vk_post_id IS NOT NULL",
            )
            .bind(owner_id)
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?;

            let now_utc = chrono::Utc::now();

            for row in local_scheduled {
                let pid: i64 = row.get("id");
                let vk_id: i64 = row.get("vk_post_id");
                let sched_str: String = row.get("scheduled_at_utc");

                if !vk_post_ids.contains(&vk_id) {
                    let sched_dt = chrono::DateTime::parse_from_rfc3339(&sched_str)
                        .map(|d| d.with_timezone(&chrono::Utc))
                        .unwrap_or(now_utc);

                    let new_status = if sched_dt > (now_utc + chrono::Duration::minutes(1)) {
                        "deleted_in_vk"
                    } else {
                        let is_published = vk
                            .check_wall_post_published(owner_id, vk_id)
                            .await
                            .unwrap_or(false);
                        if is_published {
                            "published"
                        } else {
                            "deleted_in_vk"
                        }
                    };

                    sqlx::query("UPDATE posts SET status = ? WHERE id = ?")
                        .bind(new_status)
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
pub async fn revert_vk_post_to_local_same_time(
    post_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let post = sqlx::query("SELECT target_id, vk_post_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(p) = post {
        let target_id: i64 = p.get("target_id");
        let vk_post_id: Option<i64> = p.get("vk_post_id");

        if let Some(vk_id) = vk_post_id {
            if let Ok(t_row) = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?")
                .bind(target_id)
                .fetch_one(&state.db)
                .await
            {
                let account_id: i64 = t_row.get("account_id");
                let owner_id: i64 = t_row.get("owner_id");
                if let Ok(acc) = sqlx::query("SELECT token FROM accounts WHERE id = ?")
                    .bind(account_id)
                    .fetch_one(&state.db)
                    .await
                {
                    let db_tok: String = acc.get("token");
                    let token = TokenVault::get_token(account_id, &db_tok);
                    let vk = VkClient::new(token);
                    let _ = vk.delete_wall_post(owner_id, vk_id).await;
                }
            }
        }
    }

    sqlx::query(
        "UPDATE posts SET status = 'queued', vk_post_id = NULL, error_message = NULL WHERE id = ?",
    )
    .bind(post_id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn revert_vk_post_to_local_next_slot(
    post_id: i64,
    pattern_id: i64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let post = sqlx::query("SELECT target_id, vk_post_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(ref p) = post {
        let target_id: i64 = p.get("target_id");
        let vk_post_id: Option<i64> = p.get("vk_post_id");

        if let Some(vk_id) = vk_post_id {
            if let Ok(t_row) = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?")
                .bind(target_id)
                .fetch_one(&state.db)
                .await
            {
                let account_id: i64 = t_row.get("account_id");
                let owner_id: i64 = t_row.get("owner_id");
                if let Ok(acc) = sqlx::query("SELECT token FROM accounts WHERE id = ?")
                    .bind(account_id)
                    .fetch_one(&state.db)
                    .await
                {
                    let db_tok: String = acc.get("token");
                    let token = TokenVault::get_token(account_id, &db_tok);
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
pub async fn delete_local_post(
    post_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    clean_post_disk_assets(post_id, &app, &state.db).await;
    sqlx::query("DELETE FROM attachments WHERE post_id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM posts WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_vk_post(
    post_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    clean_post_disk_assets(post_id, &app, &state.db).await;
    let post = sqlx::query("SELECT target_id, vk_post_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(p) = post {
        let target_id: i64 = p.get("target_id");
        let vk_post_id: Option<i64> = p.get("vk_post_id");

        if let Some(vk_id) = vk_post_id {
            if let Ok(t_row) = sqlx::query("SELECT account_id, owner_id FROM targets WHERE id = ?")
                .bind(target_id)
                .fetch_one(&state.db)
                .await
            {
                let account_id: i64 = t_row.get("account_id");
                let owner_id: i64 = t_row.get("owner_id");
                if let Ok(acc) = sqlx::query("SELECT token FROM accounts WHERE id = ?")
                    .bind(account_id)
                    .fetch_one(&state.db)
                    .await
                {
                    let db_tok: String = acc.get("token");
                    let token = TokenVault::get_token(account_id, &db_tok);
                    let vk = VkClient::new(token);
                    let _ = vk.delete_wall_post(owner_id, vk_id).await;
                }
            }
        }
    }

    sqlx::query("DELETE FROM attachments WHERE post_id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM posts WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_history_post(
    post_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    clean_post_disk_assets(post_id, &app, &state.db).await;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM attachments WHERE post_id = ?")
        .bind(post_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM posts WHERE id = ?")
        .bind(post_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

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
    clean_post_disk_assets(post_id, &app, &state.db).await;
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
            "INSERT INTO attachments (post_id, local_path, original_path, file_name, size_bytes, attachment_kind, upload_status, vk_attachment_string, order_index)
             VALUES (?, ?, ?, ?, 0, 'photo', ?, ?, ?) RETURNING id"
        )
        .bind(post_id)
        .bind(&att.local_path)
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
            let _ = tokio::fs::write(&thumb_path, b64).await;
        } else if let Some(ref lp) = att.local_path {
            if let Ok(b64) = get_file_preview_base64(lp.clone()).await {
                let _ = tokio::fs::write(&thumb_path, b64).await;
            }
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

fn delete_file_with_mode(path: &Path, to_trash: bool) -> bool {
    if !path.exists() {
        return false;
    }
    if to_trash {
        if trash::delete(path).is_ok() {
            return true;
        }
        std::fs::remove_file(path).is_ok()
    } else {
        std::fs::remove_file(path).is_ok()
    }
}

// Очистка файлов с диска: прямой путь + поиск по имени и хэшу в реестре
#[tauri::command]
pub async fn clean_uploaded_local_files(
    target_id: i64,
    to_trash: bool,
    folder_hint: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    // 1. Находим все посты, находящиеся в отложке ВК или опубликованные
    let post_ids: Vec<i64> = sqlx::query_scalar(
        "SELECT p.id 
         FROM posts p 
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
           AND p.status IN ('transferred_to_vk', 'published')",
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if post_ids.is_empty() {
        return Ok(0);
    }

    // 2. Собираем каталоги для умного поиска
    let mut search_dirs: Vec<PathBuf> = Vec::new();

    if let Some(ref hint) = folder_hint {
        let p = PathBuf::from(hint);
        if p.exists() {
            search_dirs.push(p);
        }
    }

    let known_rows: Vec<String> = sqlx::query_scalar("SELECT dir_path FROM known_folders")
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    for d in known_rows {
        let p = PathBuf::from(d);
        if p.exists() && !search_dirs.contains(&p) {
            search_dirs.push(p);
        }
    }

    // Добавляем стандартные папки пользователя
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let p = PathBuf::from(&profile);
        for sub in &["Desktop", "Downloads", "Pictures"] {
            let sp = p.join(sub);
            if sp.exists() && !search_dirs.contains(&sp) {
                search_dirs.push(sp);
            }
        }
    }

    let mut deleted_count = 0;
    let mut cleaned_att_ids = Vec::new();
    let mut cleaned_tracked_ids = Vec::new();

    for pid in post_ids {
        // Поиск по attachments
        let atts = sqlx::query(
            "SELECT id, local_path, original_path, file_name, file_hash FROM attachments WHERE post_id = ?",
        )
        .bind(pid)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        for r in atts {
            let att_id: i64 = r.get("id");
            let local_p: Option<String> = r.try_get("local_path").ok().flatten();
            let orig_p: Option<String> = r.try_get("original_path").ok().flatten();
            let fname: String = r.try_get("file_name").unwrap_or_default();
            let _fhash: Option<String> = r.try_get("file_hash").ok().flatten();

            let mut was_deleted = false;

            // Способ 1: Прямой путь
            for candidate in [local_p.as_deref(), orig_p.as_deref()].into_iter().flatten() {
                let p = Path::new(candidate);
                if p.exists() && !p.to_string_lossy().contains("thumbnails") {
                    if delete_file_with_mode(p, to_trash) {
                        was_deleted = true;
                        break;
                    }
                }
            }

            // Способ 2: Поиск по имени файла в известных директориях
            if !was_deleted && !fname.is_empty() && fname != "vk_media" {
                for sdir in &search_dirs {
                    let direct_candidate = sdir.join(&fname);
                    if direct_candidate.exists() {
                        if delete_file_with_mode(&direct_candidate, to_trash) {
                            was_deleted = true;
                            break;
                        }
                    }
                }
            }

            if was_deleted {
                deleted_count += 1;
                cleaned_att_ids.push(att_id);
            }
        }

        // Поиск по tracked_files
        let tracked = sqlx::query(
            "SELECT id, file_path, file_name, file_hash FROM tracked_files WHERE post_id = ? AND status = 'pending'",
        )
        .bind(pid)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        for tr in tracked {
            let tr_id: i64 = tr.get("id");
            let fpath_str: String = tr.get("file_path");
            let fname: String = tr.get("file_name");
            let p = Path::new(&fpath_str);
            let mut was_deleted = false;

            if p.exists() {
                if delete_file_with_mode(p, to_trash) {
                    was_deleted = true;
                }
            } else if !fname.is_empty() {
                for sdir in &search_dirs {
                    let direct_candidate = sdir.join(&fname);
                    if direct_candidate.exists() {
                        if delete_file_with_mode(&direct_candidate, to_trash) {
                            was_deleted = true;
                            break;
                        }
                    }
                }
            }

            if was_deleted {
                deleted_count += 1;
                cleaned_tracked_ids.push(tr_id);
            }
        }
    }

    for att_id in cleaned_att_ids {
        let _ = sqlx::query("UPDATE attachments SET local_path = NULL, original_path = NULL WHERE id = ?")
            .bind(att_id)
            .execute(&state.db)
            .await;
    }

    for tr_id in cleaned_tracked_ids {
        let _ = sqlx::query("UPDATE tracked_files SET status = 'deleted' WHERE id = ?")
            .bind(tr_id)
            .execute(&state.db)
            .await;
    }

    // Очистка media/ временных файлов (если есть)
    if let Ok(app_dir) = app.path().app_data_dir() {
        let media_dir = app_dir.join("media");
        if media_dir.exists() {
            if let Ok(mut entries) = tokio::fs::read_dir(&media_dir).await {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    let _ = tokio::fs::remove_file(entry.path()).await;
                }
            }
        }
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

    let chunks: Vec<Vec<String>> = file_paths
        .chunks(items_per_post)
        .map(|c| c.to_vec())
        .collect();
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
            times: serde_json::from_str(&pattern_row.get::<String, _>("times_json"))
                .unwrap_or_default(),
            days: serde_json::from_str(&pattern_row.get::<String, _>("days_json"))
                .unwrap_or_default(),
            min_interval_minutes: pattern_row.try_get("min_interval_minutes").unwrap_or(30),
            interval_days: Some(interval_days),
        })
        .map_err(|e| e.to_string())?;

        let last_post = sqlx::query(
            "SELECT p.scheduled_at_utc FROM posts p
             JOIN targets t ON p.target_id = t.id
             WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
               AND p.status IN ('queued', 'transferred_to_vk')
             ORDER BY datetime(p.scheduled_at_utc) DESC LIMIT 1",
        )
        .bind(target_id)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

        let last_time = last_post.and_then(|r| {
            let s: String = r.get("scheduled_at_utc");
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|dt| dt.with_timezone(&chrono::Utc))
        });

        engine
            .calculate_post_time(chrono::Utc::now(), last_time)
            .map_err(|e| e.to_string())?
    };

    let guid = uuid::Uuid::new_v4().to_string();
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    let post_id = sqlx::query(
        "INSERT INTO posts (
            account_id, target_id, pattern_id, text, scheduled_at_utc, guid,
            signed, close_comments, mute_notifications, mark_as_ads, attachments_view_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
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
        let p = Path::new(path_str);
        let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("file");
        let size = std::fs::metadata(p).map(|m| m.len() as i64).unwrap_or(0);

        let bytes = tokio::fs::read(path_str).await.unwrap_or_default();
        let file_hash = compute_file_hash(&bytes);

        // Запоминаем каталог файлов
        if let Some(parent) = p.parent() {
            let p_str = parent.to_string_lossy().to_string();
            let _ = sqlx::query("INSERT OR IGNORE INTO known_folders (dir_path) VALUES (?)")
                .bind(&p_str)
                .execute(&mut *tx)
                .await;
        }

        // Сохраняем в attachments
        let att_id = sqlx::query(
            "INSERT INTO attachments (post_id, local_path, original_path, file_name, file_hash, size_bytes, attachment_kind, order_index)
             VALUES (?, ?, ?, ?, ?, ?, 'photo', ?) RETURNING id",
        )
        .bind(post_id)
        .bind(path_str)
        .bind(path_str)
        .bind(name)
        .bind(&file_hash)
        .bind(size)
        .bind(idx as i32)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .get::<i64, _>("id");

        // Записываем в tracked_files
        let _ = sqlx::query(
            "INSERT INTO tracked_files (post_id, target_id, file_path, file_name, file_hash)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(post_id)
        .bind(target_id)
        .bind(path_str)
        .bind(name)
        .bind(&file_hash)
        .execute(&mut *tx)
        .await;

        // Сохраняем миниатюру base64 в thumbnails/{att_id}.thumb
        if let Ok(b64) = get_file_preview_base64(path_str.clone()).await {
            let thumb_path = thumbs_dir.join(format!("{}.thumb", att_id));
            let _ = tokio::fs::write(&thumb_path, b64).await;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(post_id)
}

#[tauri::command]
pub async fn start_transfer_pipeline(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let token_row = sqlx::query(
        "SELECT a.id, a.token FROM accounts a JOIN targets t ON t.account_id = a.id WHERE t.id = ?",
    )
    .bind(target_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Не найден токен для выбранной цели".to_string())?;

    let account_id: i64 = token_row.get("id");
    let db_token: String = token_row.get("token");
    let token = TokenVault::get_token(account_id, &db_token);
    let vk = VkClient::new(token);

    let db = state.db.clone();
    tokio::spawn(async move {
        if let Err(e) = TransferWorker::run_transfer(app, db, vk, target_id).await {
            eprintln!("Transfer worker error: {:?}", e);
        }
    });

    Ok(())
}