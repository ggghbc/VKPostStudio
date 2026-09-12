use anyhow::{anyhow, Result};
use chrono::{DateTime, Datelike, Duration, NaiveDate, NaiveTime, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternConfig {
    pub timezone: String,
    pub times: Vec<String>,
    pub days: Vec<String>,
    pub min_interval_minutes: i64,
}

pub struct PatternEngine {
    tz: Tz,
    slots: Vec<NaiveTime>,
    days_of_week: Vec<u32>,
    min_interval: Duration,
}

impl PatternEngine {
    pub fn from_config(config: &PatternConfig) -> Result<Self> {
        let tz: Tz = config
            .timezone
            .parse()
            .map_err(|_| anyhow!("Некорректная таймзона: {}", config.timezone))?;

        let mut slots = Vec::new();
        for t_str in &config.times {
            let parsed = NaiveTime::parse_from_str(t_str, "%H:%M")
                .map_err(|_| anyhow!("Неверный формат времени '{}', ожидается HH:MM", t_str))?;
            slots.push(parsed);
        }
        slots.sort();

        if slots.is_empty() {
            return Err(anyhow!("Паттерн должен содержать хотя бы одно время"));
        }

        let mut days_of_week = Vec::new();
        for d_str in &config.days {
            let day_num = match d_str.to_lowercase().as_str() {
                "mon" => 1,
                "tue" => 2,
                "wed" => 3,
                "thu" => 4,
                "fri" => 5,
                "sat" => 6,
                "sun" => 7,
                _ => return Err(anyhow!("Неизвестный день недели: {}", d_str)),
            };
            days_of_week.push(day_num);
        }
        days_of_week.sort();

        Ok(Self {
            tz,
            slots,
            days_of_week,
            min_interval: Duration::minutes(config.min_interval_minutes),
        })
    }

    pub fn get_next_slot(&self, after_utc: DateTime<Utc>) -> Result<DateTime<Utc>> {
        let local_after = after_utc.with_timezone(&self.tz);
        let mut check_date: NaiveDate = local_after.date_naive();

        for _ in 0..365 {
            let weekday = check_date.weekday().number_from_monday();
            if self.days_of_week.contains(&weekday) {
                for slot in &self.slots {
                    let candidate_local = check_date
                        .and_time(*slot)
                        .and_local_timezone(self.tz)
                        .single()
                        .ok_or_else(|| anyhow!("Ошибка преобразования таймзоны при переходе"))?;

                    let candidate_utc = candidate_local.with_timezone(&Utc);

                    if candidate_utc > after_utc {
                        if candidate_utc - after_utc >= self.min_interval {
                            return Ok(candidate_utc);
                        }
                    }
                }
            }
            check_date += Duration::days(1);
        }

        Err(anyhow!("Не удалось найти свободный слот на год вперед"))
    }

    pub fn calculate_post_time(
        &self,
        now_utc: DateTime<Utc>,
        latest_queue_time: Option<DateTime<Utc>>,
    ) -> Result<DateTime<Utc>> {
        match latest_queue_time {
            Some(last_time) => {
                let baseline = if last_time > now_utc {
                    last_time
                } else {
                    now_utc
                };
                self.get_next_slot(baseline)
            }
            None => self.get_next_slot(now_utc),
        }
    }
}