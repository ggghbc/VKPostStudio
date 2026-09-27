use anyhow::{anyhow, Result};
use sqlx::{Row, SqlitePool};
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;

use crate::services::token_vault::TokenVault;
use crate::vk::client::VkClient;
use crate::vk::device::{
    VkDeviceManager, VK_ANDROID_AUTH_VERSION, VK_ANDROID_CLIENT_ID, VK_ANDROID_CLIENT_SECRET,
    VK_AUTH_USER_AGENT,
};

/// Exchange an existing access token for a common session secret (exchange_token) via auth.getExchangeToken
pub async fn exchange_token_for_secret(
    http: &reqwest::Client,
    access_token: &str,
    device_id: &str,
) -> Result<String> {
    if access_token.trim().is_empty() {
        return Err(anyhow!("Access token is empty"));
    }

    let url = "https://api.vk.com/method/auth.getExchangeToken";
    let params = [
        ("create_common_token", "1"),
        ("create_tier_tokens", "0"),
        ("api_id", VK_ANDROID_CLIENT_ID),
        ("device_id", device_id),
        ("v", VK_ANDROID_AUTH_VERSION),
    ];

    let body = url::form_urlencoded::Serializer::new(String::new())
        .extend_pairs(&params)
        .finish();

    let resp = http
        .post(url)
        .header(reqwest::header::USER_AGENT, VK_AUTH_USER_AGENT)
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", access_token.trim()),
        )
        .header("x-vk-android-client", "new")
        .header("x-screen", "nowhere")
        .body(body)
        .send()
        .await
        .map_err(|e| anyhow!("Network error calling auth.getExchangeToken: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow!("Failed to parse JSON from auth.getExchangeToken: {}", e))?;

    if let Some(err) = resp.get("error") {
        let msg = err
            .get("error_msg")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown error");
        let code = err.get("error_code").and_then(|v| v.as_i64()).unwrap_or(0);
        return Err(anyhow!("VK API error {}: {}", code, msg));
    }

    let tokens = resp
        .get("response")
        .and_then(|r| r.get("users_exchange_tokens"))
        .and_then(|t| t.as_array())
        .ok_or_else(|| {
            anyhow!(
                "users_exchange_tokens not found in getExchangeToken response: {:?}",
                resp
            )
        })?;

    let common_token = tokens
        .first()
        .and_then(|item| item.get("common_token"))
        .and_then(|ct| ct.as_str())
        .ok_or_else(|| anyhow!("common_token empty in getExchangeToken response"))?;

    Ok(common_token.to_string())
}

/// Silently refresh an access token using an exchange secret via auth.refreshTokens
pub async fn refresh_token(http: &reqwest::Client, secret: &str) -> Result<String> {
    if secret.trim().is_empty() {
        return Err(anyhow!("Secret is empty"));
    }

    let url = "https://api.vk.com/method/auth.refreshTokens";
    let params = [
        ("client_id", VK_ANDROID_CLIENT_ID),
        ("client_secret", VK_ANDROID_CLIENT_SECRET),
        ("exchange_tokens", secret.trim()),
        ("active_index", "0"),
        ("scope", "all"),
        ("initiator", "expired_token"),
        ("api_id", VK_ANDROID_CLIENT_ID),
        ("v", VK_ANDROID_AUTH_VERSION),
    ];

    let body = url::form_urlencoded::Serializer::new(String::new())
        .extend_pairs(&params)
        .finish();

    let resp = http
        .post(url)
        .header(reqwest::header::USER_AGENT, VK_AUTH_USER_AGENT)
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .header("x-vk-android-client", "new")
        .header("x-screen", "nowhere")
        .body(body)
        .send()
        .await
        .map_err(|e| anyhow!("Network error calling auth.refreshTokens: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow!("Failed to parse JSON from auth.refreshTokens: {}", e))?;

    if let Some(err) = resp.get("error") {
        let msg = err
            .get("error_msg")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown error");
        let code = err.get("error_code").and_then(|v| v.as_i64()).unwrap_or(0);
        return Err(anyhow!("VK API error {}: {}", code, msg));
    }

    let success_arr = resp
        .get("response")
        .and_then(|r| r.get("success"))
        .and_then(|s| s.as_array())
        .ok_or_else(|| {
            anyhow!(
                "success array not found in refreshTokens response: {:?}",
                resp
            )
        })?;

    let first = success_arr
        .first()
        .ok_or_else(|| anyhow!("success array is empty in refreshTokens response"))?;

    let new_token = first
        .get("access_token")
        .and_then(|at| at.get("token"))
        .and_then(|t| t.as_str())
        .ok_or_else(|| {
            anyhow!(
                "access_token.token not found in refreshTokens response: {:?}",
                first
            )
        })?;

    Ok(new_token.to_string())
}

/// Automatically attempt to refresh an account's token using its stored secret.
/// Updates TokenVault, database, and optionally the active VkClient in AppState.
pub async fn try_refresh_account_token(
    account_id: i64,
    db: &SqlitePool,
    active_vk_opt: Option<&Arc<Mutex<Option<VkClient>>>>,
    app_dir: &Path,
) -> Result<String> {
    let row = sqlx::query("SELECT token, secret, is_active FROM accounts WHERE id = ?")
        .bind(account_id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| anyhow!("Account {} not found", account_id))?;

    let db_secret = row
        .get::<Option<String>, _>("secret")
        .unwrap_or_default();
    let secret = TokenVault::get_secret(account_id, &db_secret);

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()?;

    let final_secret = if secret.trim().is_empty() {
        // Opportunistic exchange if secret wasn't saved yet:
        let db_tok = row.get::<String, _>("token");
        let cur_tok = TokenVault::get_token(account_id, &db_tok);
        let device_mgr = VkDeviceManager::load_or_generate(app_dir);
        match exchange_token_for_secret(&http, &cur_tok, device_mgr.get_device_id()).await {
            Ok(s) => {
                let _ = TokenVault::store_secret(account_id, &s);
                let _ =
                    sqlx::query("UPDATE accounts SET secret = 'keyring_protected' WHERE id = ?")
                        .bind(account_id)
                        .execute(db)
                        .await;
                s
            }
            Err(e) => {
                return Err(anyhow!(
                    "Cannot refresh token: secret is missing and exchange failed: {}",
                    e
                ));
            }
        }
    } else {
        secret
    };

    let new_token = refresh_token(&http, &final_secret).await?;

    // Store new token
    let _ = TokenVault::store_token(account_id, &new_token);
    let _ = sqlx::query("UPDATE accounts SET token = 'keyring_protected' WHERE id = ?")
        .bind(account_id)
        .execute(db)
        .await;

    // Try to get and store an updated secret with the new token
    let device_mgr = VkDeviceManager::load_or_generate(app_dir);
    if let Ok(new_secret) =
        exchange_token_for_secret(&http, &new_token, device_mgr.get_device_id()).await
    {
        let _ = TokenVault::store_secret(account_id, &new_secret);
        let _ = sqlx::query("UPDATE accounts SET secret = 'keyring_protected' WHERE id = ?")
            .bind(account_id)
            .execute(db)
            .await;
    }

    let is_active: bool = row.get::<i64, _>("is_active") == 1;
    if is_active {
        if let Some(active_vk) = active_vk_opt {
            let mut guard = active_vk.lock().await;
            *guard = Some(VkClient::new(new_token.clone()));
        }
    }

    Ok(new_token)
}
