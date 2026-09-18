use crate::vk::client::{TokenOwner, VkClient};
use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

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

#[tauri::command]
pub async fn open_vk_auth_browser() -> Result<(), String> {
    let auth_url = "https://oauth.vk.com/authorize?client_id=6287487&scope=wall,photos,docs,groups,offline&response_type=token&redirect_uri=https://oauth.vk.com/blank.html&display=page";
    let _ = open::that(auth_url);
    Ok(())
}

#[tauri::command]
pub async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountDto>, String> {
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
pub async fn switch_account(account_id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
pub async fn delete_account(account_id: i64, state: State<'_, AppState>) -> Result<(), String> {
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
pub async fn add_token(raw_token: String, state: State<'_, AppState>) -> Result<AccountDto, String> {
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

    // Проверяем страницу по числовому user_id, чтобы не плодить дубликаты и не терять историю
    let existing_acc = sqlx::query("SELECT id FROM accounts WHERE user_id = ? ORDER BY id ASC LIMIT 1")
        .bind(raw_user_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let account_id = match existing_acc {
        Some(row) => {
            let acc_id: i64 = row.get("id");
            sqlx::query("UPDATE accounts SET is_active = 0").execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query("UPDATE accounts SET name = ?, token = ?, is_active = 1 WHERE id = ?")
                .bind(&display_token_name)
                .bind(&clean_token)
                .bind(acc_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

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

    // Синхронизация целей без смены их primary key (история постов остаётся целой)
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

// Удаление недействительных/просроченных токенов
#[tauri::command]
pub async fn clean_expired_tokens(state: State<'_, AppState>) -> Result<usize, String> {
    let accounts = sqlx::query("SELECT id, token, name, is_active FROM accounts")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let mut deleted_count = 0;

    for row in accounts {
        let acc_id: i64 = row.get("id");
        let token: String = row.get("token");
        let is_active: i64 = row.get("is_active");

        let client = VkClient::new(token);
        if client.verify_token().await.is_err() {
            // Токен не прошёл валидацию VK (просрочен или отозван)
            let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
            let _ = sqlx::query("DELETE FROM targets WHERE account_id = ?").bind(acc_id).execute(&mut *tx).await;
            let _ = sqlx::query("DELETE FROM accounts WHERE id = ?").bind(acc_id).execute(&mut *tx).await;

            if is_active == 1 {
                let fallback = sqlx::query("SELECT id, token FROM accounts ORDER BY id DESC LIMIT 1")
                    .fetch_optional(&mut *tx)
                    .await
                    .ok()
                    .flatten();

                if let Some(f) = fallback {
                    let fid: i64 = f.get("id");
                    let ftoken: String = f.get("token");
                    let _ = sqlx::query("UPDATE accounts SET is_active = 1 WHERE id = ?").bind(fid).execute(&mut *tx).await;
                    let mut vk_guard = state.active_vk.lock().await;
                    *vk_guard = Some(VkClient::new(ftoken));
                } else {
                    let mut vk_guard = state.active_vk.lock().await;
                    *vk_guard = None;
                }
            }

            tx.commit().await.map_err(|e| e.to_string())?;
            deleted_count += 1;
        }
    }

    Ok(deleted_count)
}

#[tauri::command]
pub async fn get_targets(account_id: Option<i64>, state: State<'_, AppState>) -> Result<Vec<TargetDto>, String> {
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