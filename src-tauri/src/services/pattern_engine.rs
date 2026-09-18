use anyhow::{anyhow, Result};
use chrono::{DateTime, Datelike, Duration, NaiveTime, TimeZone, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternConfig {
    pub timezone: String,
    pub times: Vec<String>,
    pub days: Vec<String>,
    pub min_interval_minutes: i64,
    pub interval_days: Option<i64>,
}

pub struct PatternEngine {
    tz: Tz,
    times: Vec<NaiveTime>,
    days: Vec<u32>,
    min_interval: Duration,
    interval_days: i64,
}

impl PatternEngine {
    pub fn from_config(config: &PatternConfig) -> Result<Self> {
        let tz = Tz::from_str(&config.timezone)
            .map_err(|_| anyhow!("Неверная таймзона: {}", config.timezone))?;

        let mut times = Vec::new();
        for t_str in &config.times {
            let parts: Vec<&str> = t_str.split(':').collect();
            if parts.len() != 2 {
                continue;
            }
            let h: u32 = parts[0].parse().unwrap_or(0);
            let m: u32 = parts[1].parse().unwrap_or(0);
            if let Some(nt) = NaiveTime::from_hms_opt(h, m, 0) {
                times.push(nt);
            }
        }
        times.sort();

        if times.is_empty() {
            return Err(anyhow!("Не задано ни одного корректного времени в паттерне"));
        }

        let mut days = Vec::new();
        for d in &config.days {
            match d.to_lowercase().as_str() {
                "mon" => days.push(1),
                "tue" => days.push(2),
                "wed" => days.push(3),
                "thu" => days.push(4),
                "fri" => days.push(5),
                "sat" => days.push(6),
                "sun" => days.push(7),
                _ => {}
            }
        }
        if days.is_empty() {
            days = vec![1, 2, 3, 4, 5, 6, 7];
        }

        let interval_days = config.interval_days.unwrap_or(1).max(1);

        Ok(Self {
            tz,
            times,
            days,
            min_interval: Duration::minutes(config.min_interval_minutes.max(5)),
            interval_days,
        })
    }

    pub fn calculate_post_time(
        &self,
        now_utc: DateTime<Utc>,
        last_post_utc: Option<DateTime<Utc>>,
    ) -> Result<DateTime<Utc>> {
        let now_local = now_utc.with_timezone(&self.tz);
        let min_allowed = now_local + Duration::minutes(2);

        match last_post_utc {
            None => {
                let mut check_date = now_local.date_naive();
                for _ in 0..365 {
                    let weekday = check_date.weekday().number_from_monday();
                    if self.days.contains(&weekday) {
                        for t in &self.times {
                            if let Some(cand_dt) = self.tz.from_local_datetime(&check_date.and_time(*t)).single() {
                                if cand_dt >= min_allowed {
                                    return Ok(cand_dt.with_timezone(&Utc));
                                }
                            }
                        }
                    }
                    check_date += Duration::days(1);
                }
                Err(anyhow!("Не удалось найти свободный слот"))
            }
            Some(last_utc) => {
                let last_local = last_utc.with_timezone(&self.tz);
                let base_target = if last_local < now_local { now_local } else { last_local };
                let last_date = last_local.date_naive();

                // 1. Проверяем более поздние слоты в тот же день (если в паттерне несколько времен)
                for t in &self.times {
                    if let Some(cand_dt) = self.tz.from_local_datetime(&last_date.and_time(*t)).single() {
                        if cand_dt > last_local && cand_dt >= min_allowed && (cand_dt - last_local) >= self.min_interval {
                            return Ok(cand_dt.with_timezone(&Utc));
                        }
                    }
                }

                // 2. Сдвигаемся на следующий день с учетом interval_days (например, +3 дня)
                let mut check_date = last_date + Duration::days(self.interval_days);
                for _ in 0..365 {
                    let weekday = check_date.weekday().number_from_monday();
                    if self.days.contains(&weekday) {
                        for t in &self.times {
                            if let Some(cand_dt) = self.tz.from_local_datetime(&check_date.and_time(*t)).single() {
                                if cand_dt >= min_allowed && (cand_dt - base_target) >= self.min_interval {
                                    return Ok(cand_dt.with_timezone(&Utc));
                                }
                            }
                        }
                    }
                    check_date += Duration::days(self.interval_days.max(1));
                }

                Err(anyhow!("Не удалось рассчитать следующий интервальный слот"))
            }
        }
    }
}