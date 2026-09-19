use crate::AppState;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::{AppHandle, Manager, State};

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
pub async fn backup_database(app: AppHandle) -> Result<String, String> {
    let p = make_db_backup(&app)?;
    Ok(p.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn init_client_timezone(timezone: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE patterns SET timezone = ? WHERE is_default = 1")
        .bind(&timezone)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_file_preview_base64(path: String) -> Result<String, String> {
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
pub async fn save_pasted_image_bytes(bytes: Vec<u8>, ext: String, app: AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pasted_dir = app_dir.join("pasted_images");
    tokio::fs::create_dir_all(&pasted_dir).await.map_err(|e| e.to_string())?;

    let file_name = format!("paste_{}_{}.{}", chrono::Utc::now().timestamp_millis(), rand::random::<u32>(), ext);
    let file_path = pasted_dir.join(file_name);
    tokio::fs::write(&file_path, bytes).await.map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn clear_database_except_tokens(state: State<'_, AppState>) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM attachments").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM posts").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}