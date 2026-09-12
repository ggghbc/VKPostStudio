use crate::vk::client::VkClient;
use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct TransferWorker;

impl TransferWorker {
    pub async fn run_transfer(
        app: AppHandle,
        db: SqlitePool,
        vk: VkClient,
        target_id: i64,
    ) -> Result<()> {
        let target_row = sqlx::query(
            "SELECT owner_id, target_type FROM targets WHERE id = ?"
        )
        .bind(target_id)
        .fetch_one(&db)
        .await?;

        let owner_id: i64 = target_row.get("owner_id");
        let target_type: String = target_row.get("target_type");
        let from_group = target_type == "community";

        let posts = sqlx::query(
            "SELECT id, text, scheduled_at_utc, guid, author_name 
             FROM posts 
             WHERE target_id = ? AND status = 'queued' 
             ORDER BY scheduled_at_utc ASC"
        )
        .bind(target_id)
        .fetch_all(&db)
        .await?;

        let total = posts.len();
        if total == 0 {
            return Ok(());
        }

        for (idx, post) in posts.iter().enumerate() {
            let post_id: i64 = post.get("id");
            let raw_text: String = post.get("text");
            let sched_utc_str: String = post.get("scheduled_at_utc");
            let guid: String = post.get("guid");
            let author_name: Option<String> = post.get("author_name");

            let scheduled_at = DateTime::parse_from_rfc3339(&sched_utc_str)
                .map(|dt| dt.with_timezone(&Utc))
                .map_err(|e| anyhow!("Неверный формат даты поста #{}: {}", post_id, e))?;

            let now = Utc::now();
            if scheduled_at <= now {
                sqlx::query("UPDATE posts SET status = 'failed', error_message = ? WHERE id = ?")
                    .bind("Время слота уже в прошлом. Пересчитайте очередь.")
                    .bind(post_id)
                    .execute(&db)
                    .await?;
                continue;
            }

            let _ = app.emit("transfer-progress", serde_json::json!({
                "current": idx + 1,
                "total": total,
                "post_id": post_id,
                "status": "uploading"
            }));

            let attachments = sqlx::query(
                "SELECT id, local_path, vk_attachment_string, upload_status 
                 FROM attachments 
                 WHERE post_id = ? ORDER BY order_index ASC"
            )
            .bind(post_id)
            .fetch_all(&db)
            .await?;

            let mut vk_attachment_strings = Vec::new();

            for att in attachments {
                let att_id: i64 = att.get("id");
                let status: String = att.get("upload_status");
                let existing_vk_str: Option<String> = att.get("vk_attachment_string");

                if status == "uploaded" && existing_vk_str.is_some() {
                    vk_attachment_strings.push(existing_vk_str.unwrap());
                    continue;
                }

                let local_path_str: Option<String> = att.get("local_path");
                if let Some(path_str) = local_path_str {
                    let path = PathBuf::from(&path_str);
                    if !path.exists() {
                        let err_msg = format!("Файл отсутствует на диске: {}", path_str);
                        sqlx::query("UPDATE posts SET status = 'failed', error_message = ? WHERE id = ?")
                            .bind(&err_msg)
                            .bind(post_id)
                            .execute(&db)
                            .await?;
                        continue;
                    }

                    match vk.upload_wall_photo(owner_id, &path).await {
                        Ok(vk_string) => {
                            sqlx::query(
                                "UPDATE attachments SET 
                                    upload_status = 'uploaded', 
                                    vk_attachment_string = ?, 
                                    local_path = NULL 
                                 WHERE id = ?"
                            )
                            .bind(&vk_string)
                            .bind(att_id)
                            .execute(&db)
                            .await?;

                            vk_attachment_strings.push(vk_string);
                        }
                        Err(e) => {
                            let err_msg = format!("Ошибка загрузки вложения: {}", e);
                            sqlx::query("UPDATE attachments SET upload_status = 'error', error_message = ? WHERE id = ?")
                                .bind(&err_msg)
                                .bind(att_id)
                                .execute(&db)
                                .await?;
                            return Err(anyhow!(err_msg));
                        }
                    }
                }
            }

            let final_message = match author_name {
                Some(name) if !name.trim().is_empty() => format!("{}\n\n— {}", raw_text, name.trim()),
                _ => raw_text,
            };

            let vk_result = vk
                .schedule_wall_post(
                    owner_id,
                    &final_message,
                    &vk_attachment_strings,
                    scheduled_at.timestamp(),
                    from_group,
                    false,
                    &guid,
                )
                .await;

            match vk_result {
                Ok(vk_post_id) => {
                    sqlx::query(
                        "UPDATE posts SET status = 'transferred_to_vk', vk_post_id = ?, error_message = NULL WHERE id = ?"
                    )
                    .bind(vk_post_id)
                    .bind(post_id)
                    .execute(&db)
                    .await?;
                }
                Err(e) => {
                    sqlx::query("UPDATE posts SET status = 'failed', error_message = ? WHERE id = ?")
                        .bind(e.to_string())
                        .bind(post_id)
                        .execute(&db)
                        .await?;
                }
            }

            if idx + 1 < total {
                let jitter = (rand::random::<u64>() % 8) + 5;
                tokio::time::sleep(Duration::from_secs(jitter)).await;
            }
        }

        let _ = app.emit("transfer-finished", serde_json::json!({ "success": true }));
        Ok(())
    }
}