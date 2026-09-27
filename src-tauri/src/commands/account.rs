use crate::services::token_vault::TokenVault;
use crate::vk::client::{TokenOwner, VkClient};
use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::{AppHandle, Manager, State};

#[derive(Serialize, Deserialize)]
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

#[tauri::command]
pub async fn open_vk_auth_browser(_app: AppHandle) -> Result<(), String> {
    let client_id = "6287487";
    let scope = "wall,photos,docs,groups,offline";
    let redirect_uri = "https://oauth.vk.com/blank.html";
    let url = format!(
        "https://oauth.vk.com/authorize?client_id={}&display=page&redirect_uri={}&scope={}&response_type=token&v=5.131",
        client_id, redirect_uri, scope
    );

    crate::commands::system::open_external_url(url)?;
    Ok(())
}

#[tauri::command]
pub async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountDto>, String> {
    let rows = sqlx::query(
        "SELECT id, name, user_id, is_active FROM accounts ORDER BY is_active DESC, id ASC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(|r| AccountDto {
        id: r.get("id"),
        name: r.get("name"),
        user_id: r.get("user_id"),
        is_active: r.get::<i64, _>("is_active") == 1,
    }).collect())
}

#[tauri::command]
pub async fn switch_account(account_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("UPDATE accounts SET is_active = 0").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("UPDATE accounts SET is_active = 1 WHERE id = ?").bind(account_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;

    let row = sqlx::query("SELECT token FROM accounts WHERE id = ?").bind(account_id).fetch_one(&state.db).await.map_err(|e| e.to_string())?;
    let db_token: String = row.get("token");
    let real_token = TokenVault::get_token(account_id, &db_token);

    let mut guard = state.active_vk.lock().await;
    *guard = Some(VkClient::new(real_token));

    Ok(())
}

#[tauri::command]
pub async fn delete_account(account_id: i64, app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let post_ids: Vec<i64> = sqlx::query_scalar(
        "SELECT p.id FROM posts p JOIN targets t ON p.target_id = t.id WHERE t.account_id = ?"
    )
    .bind(account_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    for pid in post_ids {
        crate::commands::post::clean_post_disk_assets(pid, &app, &state.db).await;
    }

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM targets WHERE account_id = ?").bind(account_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM accounts WHERE id = ?").bind(account_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;

    TokenVault::delete_token(account_id);
    TokenVault::delete_secret(account_id);
    Ok(())
}

#[tauri::command]
pub async fn add_token(
    raw_token: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<AccountDto, String> {
    let mut token = if raw_token.contains("access_token=") {
        raw_token
            .split("access_token=")
            .nth(1)
            .unwrap_or("")
            .split('&')
            .next()
            .unwrap_or("")
            .to_string()
    } else {
        raw_token.trim().to_string()
    };

    if token.is_empty() {
        return Err("Токен не может быть пустым".to_string());
    }

    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let mut direct_secret: Option<String> = None;

    // Verify token or check if input is an exchange secret
    let owner_result = VkClient::new(token.clone()).verify_token().await;
    let owner = match owner_result {
        Ok(o) => o,
        Err(e) => {
            // Check if user entered an exchange token / secret directly
            match crate::services::vk_auth::refresh_token(&http, &token).await {
                Ok(new_tok) => {
                    direct_secret = Some(token.clone());
                    token = new_tok.clone();
                    VkClient::new(token.clone())
                        .verify_token()
                        .await
                        .map_err(|e2| {
                            format!("Ошибка верификации после обновления токена: {}", e2)
                        })?
                }
                Err(_) => return Err(e.to_string()),
            }
        }
    };

    let (owner_id, owner_name, target_type) = match owner {
        TokenOwner::User { id, name } => (id, name, "user"),
        TokenOwner::Group { id, name, .. } => (-id, name, "community"),
    };

    let existing = sqlx::query("SELECT id FROM accounts WHERE user_id = ?")
        .bind(owner_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let account_id = if let Some(row) = existing {
        let acc_id: i64 = row.get("id");
        sqlx::query("UPDATE accounts SET token = 'keyring_protected', name = ? WHERE id = ?")
            .bind(&owner_name)
            .bind(acc_id)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        acc_id
    } else {
        sqlx::query("INSERT INTO accounts (name, token, user_id, is_active) VALUES (?, 'keyring_protected', ?, 1) RETURNING id")
            .bind(&owner_name)
            .bind(owner_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| e.to_string())?
            .get::<i64, _>("id")
    };

    let _ = TokenVault::store_token(account_id, &token);

    // Save secret if provided or exchange token for common_token via auth.getExchangeToken
    let app_dir = app.path().app_data_dir().unwrap_or_default();
    let device_mgr = crate::vk::device::VkDeviceManager::load_or_generate(&app_dir);

    let secret_to_save = if let Some(sec) = direct_secret {
        Some(sec)
    } else {
        crate::services::vk_auth::exchange_token_for_secret(
            &http,
            &token,
            device_mgr.get_device_id(),
        )
        .await
        .ok()
    };

    if let Some(sec) = secret_to_save {
        let _ = TokenVault::store_secret(account_id, &sec);
        let _ = sqlx::query("UPDATE accounts SET secret = 'keyring_protected' WHERE id = ?")
            .bind(account_id)
            .execute(&state.db)
            .await;
    }

    // Безопасное добавление/обновление основной цели без сбоев ON CONFLICT
    let target_title = if target_type == "user" {
        format!("Мой профиль ({})", owner_name)
    } else {
        owner_name.clone()
    };

    let existing_target = sqlx::query("SELECT id FROM targets WHERE account_id = ? AND owner_id = ?")
        .bind(account_id)
        .bind(owner_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = existing_target {
        let tid: i64 = r.get("id");
        sqlx::query("UPDATE targets SET title = ?, target_type = ? WHERE id = ?")
            .bind(&target_title)
            .bind(target_type)
            .bind(tid)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        sqlx::query("INSERT INTO targets (account_id, owner_id, title, target_type) VALUES (?, ?, ?, ?)")
            .bind(account_id)
            .bind(owner_id)
            .bind(&target_title)
            .bind(target_type)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Безопасное добавление администрируемых групп
    let vk = VkClient::new(token.clone());
    *state.active_vk.lock().await = Some(vk.clone());

    if target_type == "user" {
        if let Ok(groups) = vk.get_admin_groups().await {
            for (gid, gname, _) in groups {
                let existing_group = sqlx::query("SELECT id FROM targets WHERE account_id = ? AND owner_id = ?")
                    .bind(account_id)
                    .bind(gid)
                    .fetch_optional(&state.db)
                    .await
                    .ok()
                    .flatten();

                if let Some(r) = existing_group {
                    let tid: i64 = r.get("id");
                    let _ = sqlx::query("UPDATE targets SET title = ? WHERE id = ?")
                        .bind(&gname)
                        .bind(tid)
                        .execute(&state.db)
                        .await;
                } else {
                    let _ = sqlx::query("INSERT INTO targets (account_id, owner_id, title, target_type) VALUES (?, ?, ?, 'community')")
                        .bind(account_id)
                        .bind(gid)
                        .bind(&gname)
                        .execute(&state.db)
                        .await;
                }
            }
        }
    }

    Ok(AccountDto {
        id: account_id,
        name: owner_name,
        user_id: owner_id,
        is_active: true,
    })
}

#[tauri::command]
pub async fn refresh_active_token(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let active_row = sqlx::query("SELECT id FROM accounts WHERE is_active = 1 LIMIT 1")
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = active_row {
        let acc_id: i64 = r.get("id");
        let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        match crate::services::vk_auth::try_refresh_account_token(
            acc_id,
            &state.db,
            Some(&state.active_vk),
            &app_dir,
        )
        .await
        {
            Ok(_) => Ok(true),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Нет активного аккаунта".to_string())
    }
}

#[tauri::command]
pub async fn clean_expired_tokens(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let accounts = sqlx::query("SELECT id, token FROM accounts")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let mut deleted_count = 0;
    let app_dir = app.path().app_data_dir().unwrap_or_default();

    for r in accounts {
        let acc_id: i64 = r.get("id");
        let db_tok: String = r.get("token");
        let token = TokenVault::get_token(acc_id, &db_tok);

        let vk = VkClient::new(token);
        match vk.verify_token().await {
            Ok(_) => {}
            Err(e) => {
                let err_str = e.to_string();
                let is_revoked = err_str.contains("error 5")
                    || err_str.contains("User authorization failed")
                    || err_str.contains("access_token was given to another ip");

                if is_revoked {
                    // Try auto-refreshing via secret before deleting account
                    if let Ok(new_token) = crate::services::vk_auth::try_refresh_account_token(
                        acc_id,
                        &state.db,
                        Some(&state.active_vk),
                        &app_dir,
                    )
                    .await
                    {
                        let fresh_vk = VkClient::new(new_token);
                        if fresh_vk.verify_token().await.is_ok() {
                            continue; // Successfully refreshed, preserve account!
                        }
                    }

                    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
                    let _ = sqlx::query("DELETE FROM targets WHERE account_id = ?")
                        .bind(acc_id)
                        .execute(&mut *tx)
                        .await;
                    let _ = sqlx::query("DELETE FROM accounts WHERE id = ?")
                        .bind(acc_id)
                        .execute(&mut *tx)
                        .await;
                    let _ = tx.commit().await;
                    TokenVault::delete_token(acc_id);
                    TokenVault::delete_secret(acc_id);
                    deleted_count += 1;
                }
            }
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
            .map_err(|e| e.to_string())?
    } else {
        sqlx::query("SELECT id, title, owner_id, target_type FROM targets WHERE account_id = (SELECT id FROM accounts WHERE is_active = 1 LIMIT 1) ORDER BY id ASC")
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?
    };

    Ok(rows.into_iter().map(|r| TargetDto {
        id: r.get("id"),
        title: r.get("title"),
        owner_id: r.get("owner_id"),
        target_type: r.get("target_type"),
    }).collect())
}