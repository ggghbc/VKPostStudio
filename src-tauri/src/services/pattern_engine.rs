use anyhow::Result;
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
            .or_else(|_| Tz::from_str("Europe/Moscow"))
            .unwrap_or(chrono_tz::UTC);

        let mut times = Vec::new();
        for t_str in &config.times {
            let clean = t_str.trim().trim_matches('"');
            let parts: Vec<&str> = clean.split(':').collect();
            if parts.len() == 2 {
                let h: u32 = parts[0].trim().parse().unwrap_or(0);
                let m: u32 = parts[1].trim().parse().unwrap_or(0);
                if let Some(nt) = NaiveTime::from_hms_opt(h, m, 0) {
                    times.push(nt);
                }
            }
        }
        times.sort();

        if times.is_empty() {
            times = vec![
                NaiveTime::from_hms_opt(14, 0, 0).unwrap(),
                NaiveTime::from_hms_opt(18, 0, 0).unwrap(),
                NaiveTime::from_hms_opt(21, 0, 0).unwrap(),
            ];
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
                for _ in 0..730 {
                    let weekday = check_date.weekday().number_from_monday();
                    if self.days.contains(&weekday) {
                        for t in &self.times {
                            if let Some(cand_dt) = self.make_local_datetime(check_date, *t) {
                                if cand_dt >= min_allowed {
                                    return Ok(cand_dt.with_timezone(&Utc));
                                }
                            }
                        }
                    }
                    check_date += Duration::days(1);
                }
                Ok((now_utc + Duration::hours(2)).with_timezone(&Utc))
            }
            Some(last_utc) => {
                let last_local = last_utc.with_timezone(&self.tz);
                let is_last_in_past = last_local < now_local;

                let last_date = if is_last_in_past {
                    now_local.date_naive()
                } else {
                    last_local.date_naive()
                };

                for t in &self.times {
                    if let Some(cand_dt) = self.make_local_datetime(last_date, *t) {
                        let ok_min = cand_dt >= min_allowed;
                        let ok_interval = is_last_in_past || (cand_dt - last_local) >= self.min_interval;
                        if cand_dt > last_local && ok_min && ok_interval {
                            return Ok(cand_dt.with_timezone(&Utc));
                        }
                    }
                }

                let step = if is_last_in_past { 1 } else { self.interval_days };
                let mut check_date = last_date + Duration::days(step);

                for _ in 0..730 {
                    let weekday = check_date.weekday().number_from_monday();
                    if self.days.contains(&weekday) {
                        for t in &self.times {
                            if let Some(cand_dt) = self.make_local_datetime(check_date, *t) {
                                if cand_dt >= min_allowed {
                                    return Ok(cand_dt.with_timezone(&Utc));
                                }
                            }
                        }
                    }
                    check_date += Duration::days(self.interval_days);
                }

                Ok((now_utc + Duration::hours(2)).with_timezone(&Utc))
            }
        }
    }

    fn make_local_datetime(&self, date: chrono::NaiveDate, time: NaiveTime) -> Option<DateTime<Tz>> {
        match self.tz.from_local_datetime(&date.and_time(time)) {
            chrono::LocalResult::Single(dt) => Some(dt),
            chrono::LocalResult::Ambiguous(dt, _) => Some(dt),
            chrono::LocalResult::None => None,
        }
    }
}