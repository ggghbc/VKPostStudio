use crate::services::pattern_engine::{PatternConfig, PatternEngine};
use crate::AppState;
use chrono::{DateTime, Utc};
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

fn parse_datetime_flexible(s: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return Some(DateTime::from_naive_utc_and_offset(ndt, Utc));
    }
    if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return Some(DateTime::from_naive_utc_and_offset(ndt, Utc));
    }
    None
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
pub async fn delete_pattern(pattern_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM patterns")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if count <= 1 {
        return Err("Нельзя удалить единственный паттерн".to_string());
    }

    sqlx::query("DELETE FROM patterns WHERE id = ?")
        .bind(pattern_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_next_slot_preview(
    target_id: i64,
    pattern_id: i64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let pattern_opt = sqlx::query("SELECT * FROM patterns WHERE id = ?")
        .bind(pattern_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let pattern_row = match pattern_opt {
        Some(row) => row,
        None => sqlx::query("SELECT * FROM patterns ORDER BY id ASC LIMIT 1")
            .fetch_one(&state.db)
            .await
            .map_err(|e| e.to_string())?,
    };

    let interval_days: i64 = pattern_row.try_get("interval_days").unwrap_or(1);
    let timezone: String = pattern_row.try_get("timezone").unwrap_or_else(|_| "Europe/Moscow".to_string());
    let times_raw: String = pattern_row.try_get("times_json").unwrap_or_else(|_| "[\"14:00\",\"18:00\",\"21:00\"]".to_string());
    let days_raw: String = pattern_row.try_get("days_json").unwrap_or_else(|_| "[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\",\"sat\",\"sun\"]".to_string());
    let min_interval: i64 = pattern_row.try_get("min_interval_minutes").unwrap_or(30);

    let engine = PatternEngine::from_config(&PatternConfig {
        timezone,
        times: serde_json::from_str(&times_raw).unwrap_or_else(|_| vec!["14:00".into(), "18:00".into(), "21:00".into()]),
        days: serde_json::from_str(&days_raw).unwrap_or_else(|_| vec!["mon".into(), "tue".into(), "wed".into(), "thu".into(), "fri".into(), "sat".into(), "sun".into()]),
        min_interval_minutes: min_interval,
        interval_days: Some(interval_days),
    })
    .map_err(|e| e.to_string())?;

    let last_post = sqlx::query(
        "SELECT p.scheduled_at_utc FROM posts p
         JOIN targets t ON p.target_id = t.id
         WHERE t.owner_id = (SELECT owner_id FROM targets WHERE id = ?)
           AND p.status IN ('queued', 'transferred_to_vk')
         ORDER BY datetime(p.scheduled_at_utc) DESC LIMIT 1"
    )
    .bind(target_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let last_time = last_post.and_then(|r| {
        let s: String = r.get("scheduled_at_utc");
        parse_datetime_flexible(&s)
    });

    let slot = engine
        .calculate_post_time(Utc::now(), last_time)
        .unwrap_or_else(|_| Utc::now() + chrono::Duration::hours(2));

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
    let slot = get_next_slot_preview(target_id, pattern_id, state.clone()).await?;

    sqlx::query("UPDATE posts SET scheduled_at_utc = ?, status = 'queued', error_message = NULL WHERE id = ?")
        .bind(&slot)
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(slot)
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

    sqlx::query("UPDATE posts SET scheduled_at_utc = ?, status = 'queued', error_message = NULL WHERE id = ?")
        .bind(dt.to_rfc3339())
        .bind(post_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}