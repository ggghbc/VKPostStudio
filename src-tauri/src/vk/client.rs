use anyhow::{anyhow, Context, Result};
use reqwest::{multipart, Client};
use serde::Deserialize;
use std::path::Path;

#[derive(Clone)]
pub struct VkClient {
    http: Client,
    token: String,
    v: &'static str,
}

#[derive(Deserialize)]
struct VkApiEnvelope<T> {
    response: Option<T>,
    error: Option<VkApiError>,
}

#[derive(Debug, Deserialize)]
pub struct VkApiError {
    pub error_code: i32,
    pub error_msg: String,
}

#[derive(Deserialize)]
struct UploadServerResponse {
    upload_url: String,
}

#[derive(Deserialize)]
struct SavedPhotoItem {
    id: i64,
    owner_id: i64,
}

#[derive(Deserialize)]
struct WallPostResponse {
    post_id: i64,
}

#[derive(Deserialize)]
struct GroupItem {
    id: i64,
    name: String,
    photo_100: Option<String>,
}

#[derive(Deserialize)]
struct GroupsGetResponse {
    items: Vec<GroupItem>,
}

impl VkClient {
    pub fn new(token: String) -> Self {
        Self {
            http: Client::builder().build().unwrap(),
            token,
            v: "5.199",
        }
    }

    /// Универсальный метод отправки запросов к VK API через POST x-www-form-urlencoded
    async fn post_vk<T: for<'de> Deserialize<'de>, I, K, V>(&self, method: &str, params: I) -> Result<T>
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<str>,
        V: AsRef<str>,
    {
        let url = format!("https://api.vk.com/method/{}", method);
        let mut form_url = reqwest::Url::parse(&url)?;
        for (k, v) in params {
            form_url.query_pairs_mut().append_pair(k.as_ref(), v.as_ref());
        }
        let body = form_url.query().unwrap_or("").to_string();

        let resp: VkApiEnvelope<T> = self
            .http
            .post(&url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body)
            .send()
            .await?
            .json()
            .await?;

        if let Some(err) = resp.error {
            return Err(anyhow!("VK API error {}: {}", err.error_code, err.error_msg));
        }

        resp.response.ok_or_else(|| anyhow!("VK API вернул пустой ответ"))
    }

    pub async fn verify_token(&self) -> Result<(i64, String)> {
        #[derive(Deserialize)]
        struct UserItem {
            id: i64,
            first_name: String,
            last_name: String,
        }

        let users: Vec<UserItem> = self
            .post_vk(
                "users.get",
                vec![
                    ("access_token", self.token.as_str()),
                    ("v", self.v),
                ],
            )
            .await?;

        let user = users
            .into_iter()
            .next()
            .ok_or_else(|| anyhow!("Пользователь не найден"))?;

        Ok((user.id, format!("{} {}", user.first_name, user.last_name)))
    }

    pub async fn get_admin_groups(&self) -> Result<Vec<(i64, String, Option<String>)>> {
        let res: GroupsGetResponse = self
            .post_vk(
                "groups.get",
                vec![
                    ("access_token", self.token.as_str()),
                    ("v", self.v),
                    ("filter", "admin,editor"),
                    ("extended", "1"),
                    ("fields", "photo_100"),
                ],
            )
            .await?;

        Ok(res
            .items
            .into_iter()
            .map(|g| (-g.id, g.name, g.photo_100))
            .collect())
    }

    pub async fn upload_wall_photo(&self, target_owner_id: i64, file_path: &Path) -> Result<String> {
        let file_bytes = tokio::fs::read(file_path)
            .await
            .with_context(|| format!("Не удалось прочитать файл: {:?}", file_path))?;

        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("photo.jpg")
            .to_string();

        let mut server_params = vec![
            ("access_token", self.token.clone()),
            ("v", self.v.to_string()),
        ];
        if target_owner_id < 0 {
            server_params.push(("group_id", target_owner_id.abs().to_string()));
        }

        let srv: UploadServerResponse = self
            .post_vk("photos.getWallUploadServer", server_params)
            .await?;

        let part = multipart::Part::bytes(file_bytes)
            .file_name(file_name)
            .mime_str("image/jpeg")?;

        let form = multipart::Form::new().part("photo", part);

        let upload_raw: serde_json::Value = self
            .http
            .post(&srv.upload_url)
            .multipart(form)
            .send()
            .await?
            .json()
            .await
            .context("VK upload server вернул некорректный ответ")?;

        let server = upload_raw
            .get("server")
            .and_then(|v| {
                if v.is_number() {
                    Some(v.to_string())
                } else {
                    v.as_str().map(|s| s.to_string())
                }
            })
            .ok_or_else(|| anyhow!("Ответ загрузчика не содержит server"))?;

        let photo = upload_raw
            .get("photo")
            .and_then(|v| {
                if v.is_string() {
                    v.as_str().map(|s| s.to_string())
                } else {
                    Some(v.to_string())
                }
            })
            .ok_or_else(|| anyhow!("Ответ загрузчика не содержит photo"))?;

        let hash = upload_raw
            .get("hash")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Ответ загрузчика не содержит hash"))?
            .to_string();

        let mut save_params = vec![
            ("access_token", self.token.clone()),
            ("v", self.v.to_string()),
            ("server", server),
            ("photo", photo),
            ("hash", hash),
        ];
        if target_owner_id < 0 {
            save_params.push(("group_id", target_owner_id.abs().to_string()));
        }

        let saved: Vec<SavedPhotoItem> = self
            .post_vk("photos.saveWallPhoto", save_params)
            .await?;

        let photo_item = saved
            .into_iter()
            .next()
            .ok_or_else(|| anyhow!("Ошибка сохранения фото"))?;

        Ok(format!("photo{}_{}", photo_item.owner_id, photo_item.id))
    }

    pub async fn schedule_wall_post(
        &self,
        owner_id: i64,
        message: &str,
        attachments: &[String],
        publish_date_utc_timestamp: i64,
        from_group: bool,
        signed: bool,
        guid: &str,
    ) -> Result<i64> {
        let attachments_str = attachments.join(",");
        let from_group_val = if from_group { "1" } else { "0" };
        let signed_val = if signed { "1" } else { "0" };

        let mut params = vec![
            ("access_token", self.token.clone()),
            ("v", self.v.to_string()),
            ("owner_id", owner_id.to_string()),
            ("message", message.to_string()),
            ("publish_date", publish_date_utc_timestamp.to_string()),
            ("from_group", from_group_val.to_string()),
            ("signed", signed_val.to_string()),
            ("guid", guid.to_string()),
        ];

        if !attachments_str.is_empty() {
            params.push(("attachments", attachments_str));
        }

        let res: WallPostResponse = self.post_vk("wall.post", params).await?;
        Ok(res.post_id)
    }
}