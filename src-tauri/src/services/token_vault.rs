use anyhow::{anyhow, Result};
use keyring::Entry;

const SERVICE_NAME: &str = "vk_post_studio";

pub struct TokenVault;

impl TokenVault {
    pub fn store_token(account_id: i64, token: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, &format!("token_acc_{}", account_id))
            .map_err(|e| anyhow!("Keyring init error: {}", e))?;
        entry
            .set_password(token)
            .map_err(|e| anyhow!("Keyring store error: {}", e))?;
        Ok(())
    }

    pub fn get_token(account_id: i64, fallback_db_token: &str) -> String {
        if let Ok(entry) = Entry::new(SERVICE_NAME, &format!("token_acc_{}", account_id)) {
            if let Ok(token) = entry.get_password() {
                if !token.is_empty() {
                    return token;
                }
            }
        }
        fallback_db_token.to_string()
    }

    pub fn delete_token(account_id: i64) {
        if let Ok(entry) = Entry::new(SERVICE_NAME, &format!("token_acc_{}", account_id)) {
            let _ = entry.delete_credential();
        }
        Self::delete_secret(account_id);
    }

    pub fn store_secret(account_id: i64, secret: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, &format!("secret_acc_{}", account_id))
            .map_err(|e| anyhow!("Keyring init error: {}", e))?;
        entry
            .set_password(secret)
            .map_err(|e| anyhow!("Keyring store error: {}", e))?;
        Ok(())
    }

    pub fn get_secret(account_id: i64, fallback_db_secret: &str) -> String {
        if let Ok(entry) = Entry::new(SERVICE_NAME, &format!("secret_acc_{}", account_id)) {
            if let Ok(secret) = entry.get_password() {
                if !secret.is_empty() {
                    return secret;
                }
            }
        }
        fallback_db_secret.to_string()
    }

    pub fn delete_secret(account_id: i64) {
        if let Ok(entry) = Entry::new(SERVICE_NAME, &format!("secret_acc_{}", account_id)) {
            let _ = entry.delete_credential();
        }
    }
}