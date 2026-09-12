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
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AttachmentDto {
    pub id: i64,
    pub file_name: String,
    pub size_bytes: i64,
    pub local_path: Option<String>,
    pub vk_attachment_string: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PostDto {
    pub id: i64,
    pub text: String,
    pub scheduled_at_utc: String,
    pub status: String,
    pub error_message: Option<String>,
    pub attachments_count: i64,
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
async fn add_token(token: String, state: State<'_, AppState>) -> Result<AccountDto, String> {
    let client = VkClient::new(token.clone());
    let owner = client.verify_token().await.map_err(|e| e.to_string())?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE accounts SET is_active = 0")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let (account_id, name, user_id) = match owner {
        TokenOwner::User { id, name } => {
            let acc_id = sqlx::query(
                "INSERT INTO accounts (name, user_id, token, is_active) VALUES (?, ?, ?, 1) RETURNING id"
            )
            .bind(&name)
            .bind(id)
            .bind(&token)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?
            .get::<i64, _>("id");

            sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title) VALUES (?, 'user', ?, ?)")
                .bind(acc_id)
                .bind(id)
                .bind(format!("Мой профиль ({})", name))
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            if let Ok(groups) = client.get_admin_groups().await {
                for (owner_id, group_title, photo) in groups {
                    sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title, photo_url) VALUES (?, 'community', ?, ?, ?)")
                        .bind(acc_id)
                        .bind(owner_id)
                        .bind(group_title)
                        .bind(photo)
                        .execute(&mut *tx)
                        .await
                        .ok();
                }
            }

            (acc_id, name, id)
        }
        TokenOwner::Group { id, name, photo_100 } => {
            let display_name = format!("Паблик: {}", name);
            let acc_id = sqlx::query(
                "INSERT INTO accounts (name, user_id, token, is_active) VALUES (?, ?, ?, 1) RETURNING id"
            )
            .bind(&display_name)
            .bind(-id)
            .bind(&token)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?
            .get::<i64, _>("id");

            sqlx::query("INSERT INTO targets (account_id, target_type, owner_id, title, photo_url) VALUES (?, 'community', ?, ?, ?)")
                .bind(acc_id)
                .bind(-id)
                .bind(&name)
                .bind(photo_100)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            (acc_id, display_name, -id)
        }
    };

    tx.commit().await.map_err(|e| e.to_string())?;

    let mut vk_guard = state.active_vk.lock().await;
    *vk_guard = Some(client);

    Ok(AccountDto {
        id: account_id,
        name,
        user_id,
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
async fn create_pattern(
    name: String,
    times: Vec<String>,
    timezone: String,
    state: State<'_, AppState>,
) -> Result<PatternDto, String> {
    if times.is_empty() {
        return Err("Укажите хотя бы одно время".to_string());
    }

    let times_json = serde_json::to_string(&times).map_err(|e| e.to_string())?;
    let days_json = "[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]".to_string();

    let id = sqlx::query(
        "INSERT INTO patterns (name, timezone, times_json, days_json, min_interval_minutes) 
         VALUES (?, ?, ?, ?, 30) RETURNING id"
    )
    .bind(&name)
    .bind(&timezone)
    .bind(&times_json)
    .bind(&days_json)
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .get::<i64, _>("id");

    Ok(PatternDto {
        id,
        name,
        timezone,
        times_json,
    })
}

#[tauri::command]
async fn get_queue(target_id: i64, state: State<'_, AppState>) -> Result<Vec<PostDto>, String> {
    let posts_rows = sqlx::query(
        "SELECT id, text, scheduled_at_utc, status, error_message FROM posts 
         WHERE target_id = ? AND status != 'archived' 
         ORDER BY scheduled_at_utc ASC"
    )
    .bind(target_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

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

        let attachments: Vec<AttachmentDto> = att_rows
            .into_iter()
            .map(|a| AttachmentDto {
                id: a.get("id"),
                file_name: a.get("file_name"),
                size_bytes: a.get("size_bytes"),
                local_path: a.get("local_path"),
                vk_attachment_string: a.get("vk_attachment_string"),
            })
            .collect();

        result.push(PostDto {
            id: post_id,
            text: r.get("text"),
            scheduled_at_utc: r.get("scheduled_at_utc"),
            status: r.get("status"),
            error_message: r.get("error_message"),
            attachments_count: attachments.len() as i64,
            attachments,
        });
    }

    Ok(result)
}

#[tauri::command]
async fn sync_vk_delayed_posts(
    target_id: i64,
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
                            status, vk_post_id, signed, close_comments, mute_notifications, mark_as_ads
                        ) VALUES (
                            ?, ?, COALESCE((SELECT id FROM patterns ORDER BY id ASC LIMIT 1), 1), ?, ?, ?,
                            'transferred_to_vk', ?, 0, 0, 0, 0
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

    let posts = get_queue(target_id, state).await?;
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

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone: pattern_row.get("timezone"),
        times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
        days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
        min_interval_minutes: pattern_row.get("min_interval_minutes"),
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

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone: pattern_row.get("timezone"),
        times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
        days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
        min_interval_minutes: pattern_row.get("min_interval_minutes"),
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
async fn delete_post(post_id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
async fn add_post_to_queue(
    target_id: i64,
    pattern_id: i64,
    text: String,
    signed: bool,
    close_comments: bool,
    mute_notifications: bool,
    mark_as_ads: bool,
    custom_scheduled_at: Option<String>,
    file_paths: Vec<String>,
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

        let engine = PatternEngine::from_config(&PatternConfig {
            timezone: pattern_row.get("timezone"),
            times: serde_json::from_str(&pattern_row.get::<String, _>("times_json")).unwrap_or_default(),
            days: serde_json::from_str(&pattern_row.get::<String, _>("days_json")).unwrap_or_default(),
            min_interval_minutes: pattern_row.get("min_interval_minutes"),
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
            signed, close_comments, mute_notifications, mark_as_ads
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
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

                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN signed INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN close_comments INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mute_notifications INTEGER NOT NULL DEFAULT 0").execute(&pool).await;
                let _ = sqlx::query("ALTER TABLE posts ADD COLUMN mark_as_ads INTEGER NOT NULL DEFAULT 0").execute(&pool).await;

                sqlx::query(
                    "INSERT OR IGNORE INTO patterns (id, name, timezone, times_json, days_json, min_interval_minutes, is_default)
                     VALUES (1, '3 поста в день (14:00, 18:00, 21:00)', 'Europe/Moscow', '[\"14:00\", \"18:00\", \"21:00\"]', '[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]', 30, 1)"
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
            sync_vk_delayed_posts,
            get_next_slot_preview,
            reschedule_post_next_slot,
            reschedule_post_custom,
            delete_post,
            add_post_to_queue,
            start_transfer_pipeline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}