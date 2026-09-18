mod services;
mod vk;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use services::pattern_engine::{PatternConfig, PatternEngine};
use services::transfer_worker::TransferWorker;
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager, State, WindowEvent};
use tokio::sync::Mutex;
use vk::client::{TokenOwner, VkClient};

pub struct AppState {
    pub db: SqlitePool,
    pub active_vk: Arc<Mutex<Option<VkClient>>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AccountDto {
    pub id: i64,
    pub name: String,
    pub user_id: i64,
    pub is_active: bool,
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
    pub interval_days: i64,
}

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
    pub attachments: Vec<AttachmentDto>,
}

#[derive(Serialize, Deserialize)]
pub struct SyncResultDto {
    pub posts: Vec<PostDto>,
    pub group_auth_restricted: bool,
}

fn encode_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut res = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        res.push(CHARSET[(triple >> 18) & 0x3F] as char);
        res.push(CHARSET[(triple >> 12) & 0x3F] as char);
        if chunk.len() > 1 {
            res.push(CHARSET[(triple >> 6) & 0x3F] as char);
        } else {
            res.push('=');
        }
        if chunk.len() > 2 {
            res.push(CHARSET[triple & 0x3F] as char);
        } else {
            res.push('=');
        }
    }
    res
}

fn extract_clean_token(raw_input: &str) -> String {
    let mut s = raw_input.trim();
    if let Some(idx) = s.find("access_token=") {
        s = &s[idx + "access_token=".len()..];
    }
    if let Some(idx) = s.find('#') {
        s = &s[idx + 1..];
        if let Some(token_idx) = s.find("access_token=") {
            s = &s[token_idx + "access_token=".len()..];
        }
    }
    let token = s.split('&').next().unwrap_or("").trim();
    token.trim_matches(|c| c == '"' || c == '\'' || c == ';' || c == '&').to_string()
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

fn cleanup_old_thumbnails(thumbs_dir: &PathBuf) {
    let thirty_days = Duration::from_secs(30 * 24 * 60 * 60);
    if let Ok(entries) = std::fs::read_dir(thumbs_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if let Ok(modified) = meta.modified() {
                    if let Ok(elapsed) = SystemTime::now().duration_since(modified) {
                        if elapsed > thirty_days {
                            let _ = std::fs::remove_file(entry.path());
                        }
                    }
                }
            }
        }
    }
}

pub fn make_db_backup(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("studio.sqlite");
    if !db_path.exists() {
        return Ok(db_path);
    }
    let backups_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let now_str = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let target_file = backups_dir.join(format!("studio_backup_{}.sqlite", now_str));

    std::fs::copy(&db_path, &target_file).map_err(|e| e.to_string())?;

    if let Ok(entries) = std::fs::read_dir(&backups_dir) {
        let mut list: Vec<_> = entries.flatten().collect();
        list.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH));
        while list.len() > 10 {
            if let Some(old) = list.first() {
                let _ = std::fs::remove_file(old.path());
            }
            list.remove(0);
        }
    }

    Ok(target_file)
}

#[tauri::command]
async fn backup_database(app: AppHandle) -> Result<String, String> {
    let p = make_db_backup(&app)?;
    Ok(p.to_string_lossy().to_string())
}

#[tauri::command]
async fn open_vk_auth_browser() -> Result<(), String> {
    let auth_url = "https://oauth.vk.com/authorize?client_id=6287487&scope=wall,photos,docs,groups,offline&response_type=token&redirect_uri=https://oauth.vk.com/blank.html&display=page";
    let _ = open::that(auth_url);
    Ok(())
}

#[tauri::command]
async fn get_file_preview_base64(path: String) -> Result<String, String> {
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("Не удалось прочитать файл: {}", e))?;

    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    };

    let b64 = encode_base64(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
async fn init_client_timezone(timezone: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE patterns SET timezone = ? WHERE is_default = 1")
        .bind(&timezone)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountDto>, String> {
    let rows = sqlx::query("SELECT id, name, user_id, is_active FROM accounts ORDER BY id ASC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| AccountDto {
            id: r.get("id"),
            name: r.get("name"),
            user_id: r.get("user_id"),
            is_active: r.get::<i64, _>("is_active") == 1,
        })
        .collect())
}

#[tauri::command]
async fn switch_account(account_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE accounts SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END")
        .bind(account_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let token_row = sqlx::query("SELECT token FROM accounts WHERE id = ?")
        .bind(account_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    let token: String = token_row.get("token");
    let mut vk_guard = state.active_vk.lock().await;
    *vk_guard = Some(VkClient::new(token));

    Ok(())
}

#[tauri::command]
async fn delete_account(account_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM posts WHERE account_id = ?")
        .bind(account_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM targets WHERE account_id = ?")
        .bind(account_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM accounts WHERE id = ?")
        .bind(account_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let next_account = sqlx::query("SELECT id, token FROM accounts ORDER BY id DESC LIMIT 1")
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(rem) = next_account {
        let next_id: i64 = rem.get("id");
        let next_token: String = rem.get("token");

        sqlx::query("UPDATE accounts SET is_active = 1 WHERE id = ?")
            .bind(next_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;

        let mut vk_guard = state.active_vk.lock().await;
        *vk_guard = Some(VkClient::new(next_token));
    } else {
        tx.commit().await.map_err(|e| e.to_string())?;

        let mut vk_guard = state.active_vk.lock().await;
        *vk_guard = None;
    }

    Ok(())
}

#[tauri::command]
async fn add_token(raw_token: String, state: State<'_, AppState>) -> Result<AccountDto, String> {
    let clean_token = extract_clean_token(&raw_token);
    if clean_token.is_empty() {
        return Err("Токен не может быть пустым".to_string());
    }

    let client = VkClient::new(clean_token.clone());
    let owner = client.verify_token().await.map_err(|e| e.to_string())?;

    let today_str = chrono::Local::now().format("%d/%m/%Y").to_string();

    let (raw_user_id, base_title) = match &owner {
        TokenOwner::User { id, name } => (*id, name.clone()),
        TokenOwner::Group { id, name, .. } => (-id, format!("Паблик: {}", name)),
    };

    let display_token_name = format!("{} - {}", base_title, today_str);

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // 1. Проверяем, есть ли уже токен для этой страницы VK по user_id
    let existing_acc = sqlx::query("SELECT id FROM accounts WHERE user_id = ? ORDER BY id ASC LIMIT 1")
        .bind(raw_user_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let account_id = match existing_acc {
        Some(row) => {
            let acc_id: i64 = row.get("id");
            // Деактивируем все, а этот делаем активным и обновляем его токен и имя с новой датой
            sqlx::query("UPDATE accounts SET is_active = 0").execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query("UPDATE accounts SET name = ?, token = ?, is_active = 1 WHERE id = ?")
                .bind(&display_token_name)
                .bind(&clean_token)
                .bind(acc_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            // Если были созданы лишние дубликаты аккаунта с тем же user_id — удаляем их
            let dupes = sqlx::query("SELECT id FROM accounts WHERE user_id = ? AND id != ?")
                .bind(raw_user_id)
                .bind(acc_id)
                .fetch_all(&mut *tx)
                .await
                .unwrap_or_default();

            for d in dupes {
                let d_id: i64 = d.get("id");
                let _ = sqlx::query("UPDATE posts SET account_id = ? WHERE account_id = ?")
                    .bind(acc_id)
                    .bind(d_id)
                    .execute(&mut *tx)
                    .await;
                let _ = sqlx::query("DELETE FROM targets WHERE account_id = ?")
                    .bind(d_id)
                    .execute(&mut *tx)
                    .await;
                let _ = sqlx::query("DELETE FROM accounts WHERE id = ?")
                    .bind(d_id)
                    .execute(&mut *tx)
                    .await;
            }

            acc_id
        }
        None => {
            sqlx::query("UPDATE accounts SET is_active = 0").execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query(
                "INSERT INTO accounts (name, user_id, token, is_active) VALUES (?, ?, ?, 1) RETURNING id"
            )
            .bind(&display_token_name)
            .bind(raw_user_id)
            .bind(&clean_token)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?
            .get::<i64, _>("id")
        }
    };

    // 2. Синхронизируем цели: обновляем существующие (чтобы их id не менялись и история постов сохранялась!)
    match &owner {
        TokenOwner::User { id, name } => {
            let profile_title = format!("Мой профиль ({})", name);
            let exists = sqlx::query("SELECT id FROM targets WHERE account_id = ? AND owner_id = ?")
                .bind(account_id)
                .bind(id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            if let Some(r) = exists {
                let tid: i64 = r.get("id");
                let _ = sqlx::query("UPDATE targets SET title = ? WHERE id = ?")
                    .bind(&profile_title)
                    .bind(tid)
                    .execute(&mut *tx)
                    .await;
            } else {
                let _ = sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title) VALUES (?, 'user', ?, ?)")
                    .bind(account_id)
                    .bind(id)
                    .bind(&profile_title)
                    .execute(&mut *tx)
                    .await;
            }

            if let Ok(groups) = client.get_admin_groups().await {
                for (owner_id, group_title, photo) in groups {
                    let g_exists = sqlx::query("SELECT id FROM targets WHERE account_id = ? AND owner_id = ?")
                        .bind(account_id)
                        .bind(owner_id)
                        .fetch_optional(&mut *tx)
                        .await
                        .unwrap_or(None);

                    if let Some(r) = g_exists {
                        let tid: i64 = r.get("id");
                        let _ = sqlx::query("UPDATE targets SET title = ?, photo_url = ? WHERE id = ?")
                            .bind(&group_title)
                            .bind(&photo)
                            .bind(tid)
                            .execute(&mut *tx)
                            .await;
                    } else {
                        let _ = sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title, photo_url) VALUES (?, 'community', ?, ?, ?)")
                            .bind(account_id)
                            .bind(owner_id)
                            .bind(&group_title)
                            .bind(&photo)
                            .execute(&mut *tx)
                            .await;
                    }
                }
            }
        }
        TokenOwner::Group { id, name, photo_100 } => {
            let g_exists = sqlx::query("SELECT id FROM targets WHERE account_id = ? AND owner_id = ?")
                .bind(account_id)
                .bind(-id)
                .fetch_optional(&mut *tx)
                .await
                .unwrap_or(None);

            if let Some(r) = g_exists {
                let tid: i64 = r.get("id");
                let _ = sqlx::query("UPDATE targets SET title = ?, photo_url = ? WHERE id = ?")
                    .bind(name)
                    .bind(photo_100)
                    .bind(tid)
                    .execute(&mut *tx)
                    .await;
            } else {
                let _ = sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title, photo_url) VALUES (?, 'community', ?, ?, ?)")
                    .bind(account_id)
                    .bind(-id)
                    .bind(name)
                    .bind(photo_100)
                    .execute(&mut *tx)
                    .await;
            }
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    let mut vk_guard = state.active_vk.lock().await;
    *vk_guard = Some(client);

    Ok(AccountDto {
        id: account_id,
        name: display_token_name,
        user_id: raw_user_id,
        is_active: true,
    })
}

#[tauri::command]
async fn get_targets(account_id: Option<i64>, state: State<'_, AppState>) -> Result<Vec<TargetDto>, String> {
    let rows = if let Some(acc_id) = account_id {
        sqlx::query("SELECT id, title, owner_id, target_type FROM targets WHERE account_id = ? ORDER BY id ASC")
            .bind(acc_id)
            .fetch_all(&state.db)
            .await
    } else {
        sqlx::query(
            "SELECT t.id, t.title, t.owner_id, t.target_type 
             FROM targets t 
             JOIN accounts a ON t.account_id = a.id 
             WHERE a.is_active = 1 
             ORDER BY t.id ASC"
        )
        .fetch_all(&state.db)
        .await
    }
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
    let rows = sqlx::query("SELECT id, name, timezone, times_json, interval_days FROM patterns ORDER BY id ASC")
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
            interval_days: r.try_get("interval_days").unwrap_or(1),
        })
        .collect())
}

#[tauri::command]
async fn create_pattern(
    name: String,
    times: Vec<String>,
    timezone: String,
    interval_days: i64,
    state: State<'_, AppState>,
) -> Result<PatternDto, String> {
    if times.is_empty() {
        return Err("Укажите хотя бы одно время".to_string());
    }

    let times_json = serde_json::to_string(&times).map_err(|e| e.to_string())?;
    let days_json = "[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]".to_string();
    let step_days = interval_days.max(1);

    let id = sqlx::query(
        "INSERT INTO patterns (name, timezone, times_json, days_json, min_interval_minutes, interval_days) 
         VALUES (?, ?, ?, ?, 30, ?) RETURNING id"
    )
    .bind(&name)
    .bind(&timezone)
    .bind(&times_json)
    .bind(&days_json)
    .bind(step_days)
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .get::<i64, _>("id");

    Ok(PatternDto {
        id,
        name,
        timezone,
        times_json,
        interval_days: step_days,
    })
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
        attachments,
    }
}

#[tauri::command]
async fn get_queue(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT id, text, scheduled_at_utc, status, error_message, attachments_view_mode,
                signed, close_comments, mute_notifications, mark_as_ads 
         FROM posts 
         WHERE target_id = ? AND status != 'archived' 
         ORDER BY scheduled_at_utc ASC"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let thumbs_dir = get_thumbs_dir(&app);
    let mut result = Vec::new();

    for r in posts_rows {
        let post_id: i64 = r.get("id");
        let att_rows = sqlx::query(
            "SELECT id, file_name, size_bytes, local_path, vk_attachment_string 
             FROM attachments WHERE post_id = ? ORDER BY order_index ASC"
        )
        .bind(post_id)
        .fetch_all(&state.db)
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
                if p.exists() {
                    get_file_preview_base64(lp.clone()).await.ok()
                } else {
                    None
                }
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

        result.push(map_post_row(&r, attachments));
    }

    Ok(result)
}

#[tauri::command]
async fn get_post_history(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT id, text, scheduled_at_utc, status, error_message, attachments_view_mode,
                signed, close_comments, mute_notifications, mark_as_ads 
         FROM posts 
         WHERE target_id = ? 
         ORDER BY id DESC"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let thumbs_dir = get_thumbs_dir(&app);
    let mut result = Vec::new();

    for r in posts_rows {
        let post_id: i64 = r.get("id");
        let att_rows = sqlx::query(
            "SELECT id, file_name, size_bytes, local_path, vk_attachment_string 
             FROM attachments WHERE post_id = ? ORDER BY order_index ASC"
        )
        .bind(post_id)
        .fetch_all(&state.db)
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
                if p.exists() {
                    get_file_preview_base64(lp.clone()).await.ok()
                } else {
                    None
                }
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

        result.push(map_post_row(&r, attachments));
    }

    Ok(result)
}

#[tauri::command]
async fn sync_vk_delayed_posts(
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

    let interval_days: i64 = pattern_row.try_get("interval_days").unwrap_or(1);

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone: pattern_row.get("timezone"),
        times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
        days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
        min_interval_minutes: pattern_row.get("min_interval_minutes"),
        interval_days: Some(interval_days),
    })
    .map_err(|e| e.to_string())?;

    let last_post = sqlx::query(
        "SELECT scheduled_at_utc FROM posts 
         WHERE target_id = ? 
           AND status IN ('queued', 'transferred_to_vk') 
           AND datetime(scheduled_at_utc) > datetime('now')
         ORDER BY scheduled_at_utc DESC LIMIT 1"
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
async fn reschedule_post_next_slot(
    post_id: i64,
    pattern_id: i64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let post_row = sqlx::query("SELECT target_id FROM posts WHERE id = ?")
        .bind(post_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let target_id: i64 = post_row.get("target_id");

    let pattern_row = sqlx::query("SELECT * FROM patterns WHERE id = ?")
        .bind(pattern_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let interval_days: i64 = pattern_row.try_get("interval_days").unwrap_or(1);

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone: pattern_row.get("timezone"),
        times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
        days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
        min_interval_minutes: pattern_row.get("min_interval_minutes"),
        interval_days: Some(interval_days),
    })
    .map_err(|e| e.to_string())?;

    let last_post = sqlx::query(
        "SELECT scheduled_at_utc FROM posts 
         WHERE target_id = ? 
           AND status IN ('queued', 'transferred_to_vk') 
           AND id != ?
           AND datetime(scheduled_at_utc) > datetime('now')
         ORDER BY scheduled_at_utc DESC LIMIT 1"
    )
    .bind(target_id)
    .bind(post_id)
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

    sqlx::query(
        "UPDATE posts SET scheduled_at_utc = ?, status = 'queued', error_message = NULL WHERE id = ?"
    )
    .bind(slot.to_rfc3339())
    .bind(post_id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(slot.to_rfc3339())
}

#[tauri::command]
async fn reschedule_post_custom(
    post_id: i64,
    custom_time_utc: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let dt = chrono::DateTime::parse_from_rfc3339(&custom_time_utc)
        .map(|d| d.with_timezone(&chrono::Utc))
        .map_err(|e| format!("Неверный формат времени: {}", e))?;

    sqlx::query(
        "UPDATE posts SET scheduled_at_utc = ?, status = 'queued', error_message = NULL WHERE id = ?"
    )
    .bind(dt.to_rfc3339())
    .bind(post_id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn revert_vk_post_to_local_same_time(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
async fn revert_vk_post_to_local_next_slot(
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
async fn delete_local_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE posts SET status = 'archived' WHERE id = ?")
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_vk_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
async fn delete_history_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
async fn update_post(
    post_id: i64,
    text: String,
    signed: bool,
    close_comments: bool,
    mute_notifications: bool,
    mark_as_ads: bool,
    attachments_view_mode: String,
    file_paths: Vec<String>,
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

    if !file_paths.is_empty() {
        sqlx::query("DELETE FROM attachments WHERE post_id = ?")
            .bind(post_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

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
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn clean_uploaded_local_files(
    target_id: i64,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let rows = sqlx::query(
        "SELECT a.id, a.local_path 
         FROM attachments a 
         JOIN posts p ON a.post_id = p.id 
         WHERE p.target_id = ? AND p.status = 'transferred_to_vk' AND a.local_path IS NOT NULL"
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
        let _ = sqlx::query("UPDATE attachments SET local_path = NULL WHERE id = ?")
            .bind(att_id)
            .execute(&state.db)
            .await;
    }

    Ok(deleted_count)
}

#[tauri::command]
async fn batch_create_posts(
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
async fn add_post_to_queue(
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
        let pattern_row = sqlx::query("SELECT * FROM patterns WHERE id = ?")
            .bind(pattern_id)
            .fetch_one(db)
            .await
            .map_err(|e| e.to_string())?;

        let interval_days: i64 = pattern_row.try_get("interval_days").unwrap_or(1);

        let engine = PatternEngine::from_config(&PatternConfig {
            timezone: pattern_row.get("timezone"),
            times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
            days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
            min_interval_minutes: pattern_row.get("min_interval_minutes"),
            interval_days: Some(interval_days),
        })
        .map_err(|e| e.to_string())?;

        let last_post = sqlx::query(
            "SELECT scheduled_at_utc FROM posts 
             WHERE target_id = ? 
               AND status IN ('queued', 'transferred_to_vk') 
               AND datetime(scheduled_at_utc) > datetime('now')
             ORDER BY scheduled_at_utc DESC LIMIT 1"
        )
        .bind(target_id)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

        let last_time = last_post.and_then(|r| {
            let s: String = r.get("scheduled_at_utc");
            chrono::DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&chrono::Utc))
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
async fn start_transfer_pipeline(
    target_id: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
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
                cleanup_old_thumbnails(&thumbs_dir);

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

                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN signed INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN close_comments INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mute_notifications INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mark_as_ads INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN attachments_view_mode TEXT NOT NULL DEFAULT 'grid'").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE patterns ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 1").execute(&pool).await;

                // Автоматическое слияние накопившихся дубликатов токенов с одинаковым user_id
                let duplicate_accs = sqlx::query(
                    "SELECT a1.id as dup_id, a2.id as keep_id 
                     FROM accounts a1 
                     JOIN accounts a2 ON a1.user_id = a2.user_id 
                     WHERE a1.id > a2.id"
                )
                .fetch_all(&pool)
                .await
                .unwrap_or_default();

                for row in duplicate_accs {
                    let dup_id: i64 = row.get("dup_id");
                    let keep_id: i64 = row.get("keep_id");

                    let dup_targets = sqlx::query("SELECT id, owner_id FROM targets WHERE account_id = ?")
                        .bind(dup_id)
                        .fetch_all(&pool)
                        .await
                        .unwrap_or_default();

                    for dt in dup_targets {
                        let dt_id: i64 = dt.get("id");
                        let owner_id: i64 = dt.get("owner_id");

                        let primary_target = sqlx::query("SELECT id FROM targets WHERE account_id = ? AND owner_id = ?")
                            .bind(keep_id)
                            .bind(owner_id)
                            .fetch_optional(&pool)
                            .await
                            .ok()
                            .flatten();

                        if let Some(pt) = primary_target {
                            let pt_id: i64 = pt.get("id");
                            let _ = sqlx::query("UPDATE posts SET target_id = ?, account_id = ? WHERE target_id = ?")
                                .bind(pt_id)
                                .bind(keep_id)
                                .bind(dt_id)
                                .execute(&pool)
                                .await;
                            let _ = sqlx::query("DELETE FROM targets WHERE id = ?")
                                .bind(dt_id)
                                .execute(&pool)
                                .await;
                        } else {
                            let _ = sqlx::query("UPDATE targets SET account_id = ? WHERE id = ?")
                                .bind(keep_id)
                                .bind(dt_id)
                                .execute(&pool)
                                .await;
                        }
                    }

                    let _ = sqlx::query("UPDATE posts SET account_id = ? WHERE account_id = ?")
                        .bind(keep_id)
                        .bind(dup_id)
                        .execute(&pool)
                        .await;

                    let _ = sqlx::query("DELETE FROM accounts WHERE id = ?")
                        .bind(dup_id)
                        .execute(&pool)
                        .await;
                }

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
            open_vk_auth_browser,
            get_file_preview_base64,
            init_client_timezone,
            get_accounts,
            switch_account,
            delete_account,
            add_token,
            get_targets,
            get_patterns,
            create_pattern,
            get_queue,
            get_post_history,
            sync_vk_delayed_posts,
            get_next_slot_preview,
            reschedule_post_next_slot,
            reschedule_post_custom,
            revert_vk_post_to_local_same_time,
            revert_vk_post_to_local_next_slot,
            delete_local_post,
            delete_vk_post,
            delete_history_post,
            update_post,
            clean_uploaded_local_files,
            batch_create_posts,
            backup_database,
            add_post_to_queue,
            start_transfer_pipeline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}