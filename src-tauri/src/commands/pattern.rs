use crate::services::pattern_engine::{PatternConfig, PatternEngine};
use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct PatternDto {
    pub id: i64,
    pub name: String,
    pub timezone: String,
    pub times_json: String,
    pub interval_days: i64,
}

#[tauri::command]
pub async fn get_patterns(state: State<'_, AppState>) -> Result<Vec<PatternDto>, String> {
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
pub async fn create_pattern(
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

#[tauri::command]
pub async fn get_next_slot_preview(
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
pub async fn reschedule_post_next_slot(
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
pub async fn reschedule_post_custom(
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