use anyhow::{anyhow, Context, Result};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT_LANGUAGE, USER_AGENT};
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
struct WallPostResponse {
    post_id: i64,
}

#[derive(Deserialize, Clone)]
pub struct GroupItem {
    pub id: i64,
    pub name: String,
    pub photo_100: Option<String>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum GroupsGetByIdPayload {
    List(Vec<GroupItem>),
    Wrapped { groups: Vec<GroupItem> },
}

#[derive(Deserialize)]
struct GroupsGetResponse {
    items: Vec<GroupItem>,
}

#[derive(Debug, Clone)]
pub struct VkPostponedItem {
    pub id: i64,
    pub date: i64,
    pub text: Option<String>,
    pub attachments_count: i64,
}

#[derive(Debug, Clone)]
pub enum TokenOwner {
    User { id: i64, name: String },
    Group { id: i64, name: String, photo_100: Option<String> },
}

impl VkClient {
    pub fn new(token: String) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ),
        );
        headers.insert(
            ACCEPT_LANGUAGE,
            HeaderValue::from_static("ru-RU, ru;q=0.9, en;q=0.8"),
        );

        let http = Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        Self {
            http,
            token,
            v: "5.131",
        }
    }

    async fn get_vk<T: for<'de> Deserialize<'de>, I, K, V>(&self, method: &str, params: I) -> Result<T>
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<str>,
        V: AsRef<str>,
    {
        let url = format!("https://api.vk.com/method/{}", method);
        let mut full_url = reqwest::Url::parse(&url)?;
        for (k, v) in params {
            full_url.query_pairs_mut().append_pair(k.as_ref(), v.as_ref());
        }

        let resp: VkApiEnvelope<T> = self
            .http
            .get(full_url)
            .send()
            .await?
            .json()
            .await?;

        if let Some(err) = resp.error {
            return Err(anyhow!("VK API error {}: {}", err.error_code, err.error_msg));
        }

        resp.response.ok_or_else(|| anyhow!("VK API вернул пустой ответ"))
    }

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

    pub async fn verify_token(&self) -> Result<TokenOwner> {
        #[derive(Deserialize)]
        struct UserItem {
            id: i64,
            first_name: String,
            last_name: String,
        }

        let user_resp: Result<Vec<UserItem>> = self
            .get_vk(
                "users.get",
                vec![
                    ("access_token", self.token.as_str()),
                    ("v", self.v),
                ],
            )
            .await;

        if let Ok(users) = user_resp {
            if let Some(user) = users.into_iter().next() {
                return Ok(TokenOwner::User {
                    id: user.id,
                    name: format!("{} {}", user.first_name, user.last_name),
                });
            }
        }

        let groups_payload: Result<GroupsGetByIdPayload> = self
            .get_vk(
                "groups.getById",
                vec![
                    ("access_token", self.token.as_str()),
                    ("v", self.v),
                    ("fields", "photo_100"),
                ],
            )
            .await;

        match groups_payload {
            Ok(payload) => {
                let group_list = match payload {
                    GroupsGetByIdPayload::List(list) => list,
                    GroupsGetByIdPayload::Wrapped { groups } => groups,
                };
                if let Some(group) = group_list.into_iter().next() {
                    return Ok(TokenOwner::Group {
                        id: group.id,
                        name: group.name,
                        photo_100: group.photo_100,
                    });
                }
                Err(anyhow!("Информация об объекте токена не найдена"))
            }
            Err(e) => Err(anyhow!("Не удалось авторизовать токен: {}", e)),
        }
    }

    pub async fn get_admin_groups(&self) -> Result<Vec<(i64, String, Option<String>)>> {
        let res: GroupsGetResponse = self
            .get_vk(
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

    pub async fn get_postponed_posts(&self, owner_id: i64) -> Result<Vec<VkPostponedItem>> {
        let clean_owner_id = -owner_id.abs();
        let owner_id_str = clean_owner_id.to_string();

        let params = vec![
            ("access_token", self.token.as_str()),
            ("v", self.v),
            ("owner_id", owner_id_str.as_str()),
            ("filter", "postponed"),
            ("count", "100"),
        ];

        let res_val: serde_json::Value = match self.get_vk("wall.get", params.clone()).await {
            Ok(val) => val,
            Err(e_get) => match self.post_vk("wall.get", params).await {
                Ok(val) => val,
                Err(e_post) => {
                    let code = format!(
                        "return API.wall.get({{\"owner_id\": {}, \"filter\": \"postponed\", \"count\": 100}});",
                        clean_owner_id
                    );
                    self.post_vk(
                        "execute",
                        vec![
                            ("access_token", self.token.as_str()),
                            ("v", self.v),
                            ("code", &code),
                        ],
                    )
                    .await
                    .context(format!(
                        "Не удалось получить отложку: GET: {}, POST: {}",
                        e_get, e_post
                    ))?
                }
            },
        };

        let items_arr = res_val
            .get("items")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow!("Ответ не содержит items: {:?}", res_val))?;

        let mut result = Vec::new();
        for item in items_arr {
            let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            let date = item.get("date").and_then(|v| v.as_i64()).unwrap_or(0);
            let text = item.get("text").and_then(|v| v.as_str()).map(|s| s.to_string());
            let att_count = item
                .get("attachments")
                .and_then(|v| v.as_array())
                .map(|a| a.len() as i64)
                .unwrap_or(0);

            if id > 0 && date > 0 {
                result.push(VkPostponedItem {
                    id,
                    date,
                    text,
                    attachments_count: att_count,
                });
            }
        }

        Ok(result)
    }

    pub async fn delete_wall_post(&self, owner_id: i64, post_id: i64) -> Result<()> {
        let clean_owner_id = -owner_id.abs();
        let owner_id_str = clean_owner_id.to_string();
        let post_id_str = post_id.to_string();

        let _: serde_json::Value = self
            .post_vk(
                "wall.delete",
                vec![
                    ("access_token", self.token.as_str()),
                    ("v", self.v),
                    ("owner_id", owner_id_str.as_str()),
                    ("post_id", post_id_str.as_str()),
                ],
            )
            .await?;

        Ok(())
    }

    pub async fn upload_wall_photo(&self, target_owner_id: i64, file_path: &Path) -> Result<String> {
        let file_bytes = tokio::fs::read(file_path)
            .await
            .with_context(|| format!("Не удалось прочитать файл: {:?}", file_path))?;

        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg")
            .to_lowercase();

        // Безопасное латинское имя файла исключает сбои Apache/Nginx сервера загрузки VK
        let safe_name = format!("upload_{}.{}", rand::random::<u32>(), ext);

        let is_group = target_owner_id < 0;
        let group_id_str = target_owner_id.abs().to_string();

        let mut server_params = vec![
            ("access_token", self.token.clone()),
            ("v", self.v.to_string()),
        ];
        if is_group {
            server_params.push(("group_id", group_id_str.clone()));
        }

        let srv: UploadServerResponse = self
            .post_vk("photos.getWallUploadServer", server_params)
            .await
            .context("Ошибка при получении адреса сервера загрузки фото")?;

        let mime_type = match ext.as_str() {
            "png" => "image/png",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "image/jpeg",
        };

        let part = multipart::Part::bytes(file_bytes)
            .file_name(safe_name)
            .mime_str(mime_type)?;

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
            .ok_or_else(|| anyhow!("Ответ загрузчика не содержит server: {:?}", upload_raw))?;

        let photo = upload_raw
            .get("photo")
            .and_then(|v| {
                if v.is_string() {
                    v.as_str().map(|s| s.to_string())
                } else {
                    Some(v.to_string())
                }
            })
            .ok_or_else(|| anyhow!("Ответ загрузчика не содержит photo: {:?}", upload_raw))?;

        if photo == "[]" || photo == "\"[]\"" || photo.trim().is_empty() {
            return Err(anyhow!("VK Upload Server не смог обработать файл (пустой ответ)"));
        }

        let hash = upload_raw
            .get("hash")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Ответ загрузчика не содержит hash: {:?}", upload_raw))?
            .to_string();

        let mut save_params = vec![
            ("access_token", self.token.clone()),
            ("v", self.v.to_string()),
            ("server", server),
            ("photo", photo),
            ("hash", hash),
        ];

        if is_group {
            save_params.push(("group_id", group_id_str));
        } else if target_owner_id > 0 {
            save_params.push(("user_id", target_owner_id.to_string()));
        }

        let saved_raw: serde_json::Value = self
            .post_vk("photos.saveWallPhoto", save_params)
            .await
            .context("Ошибка при вызове photos.saveWallPhoto")?;

        let photo_list = if let Some(arr) = saved_raw.as_array() {
            arr
        } else if let Some(arr) = saved_raw.get("response").and_then(|r| r.as_array()) {
            arr
        } else {
            return Err(anyhow!("Неожиданная структура ответа photos.saveWallPhoto: {:?}", saved_raw));
        };

        let first = photo_list
            .first()
            .ok_or_else(|| anyhow!("VK вернул пустой список сохраненных фото: {:?}", saved_raw))?;

        let pid = first
            .get("id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| anyhow!("Нет id фото: {:?}", first))?;

        let p_owner = first
            .get("owner_id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| anyhow!("Нет owner_id фото: {:?}", first))?;

        Ok(format!("photo{}_{}", p_owner, pid))
    }

    pub async fn schedule_wall_post(
        &self,
        owner_id: i64,
        message: &str,
        attachments: &[String],
        publish_date_utc_timestamp: i64,
        from_group: bool,
        signed: bool,
        close_comments: bool,
        mute_notifications: bool,
        mark_as_ads: bool,
        attachments_view_mode: &str,
        guid: &str,
    ) -> Result<i64> {
        let attachments_str = attachments.join(",");
        let from_group_val = if from_group { "1" } else { "0" };

        let mode = if attachments_view_mode == "carousel" { "carousel" } else { "grid" };

        let mut params = vec![
            ("access_token", self.token.clone()),
            ("v", self.v.to_string()),
            ("owner_id", owner_id.to_string()),
            ("message", message.to_string()),
            ("publish_date", publish_date_utc_timestamp.to_string()),
            ("from_group", from_group_val.to_string()),
            ("signed", if signed { "1" } else { "0" }.to_string()),
            ("close_comments", if close_comments { "1" } else { "0" }.to_string()),
            ("mute_notifications", if mute_notifications { "1" } else { "0" }.to_string()),
            ("mark_as_ads", if mark_as_ads { "1" } else { "0" }.to_string()),
            ("guid", guid.to_string()),
        ];

        if !attachments_str.is_empty() {
            params.push(("attachments", attachments_str));
            params.push(("primary_attachments_mode", mode.to_string()));
        }

        let res: WallPostResponse = self.post_vk("wall.post", params).await?;
        Ok(res.post_id)
    }
}