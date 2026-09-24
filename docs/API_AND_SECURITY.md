# VK API Reference & Security Model

This document outlines the API integrations, authentication protocols, rate-limiting safeguards, and security practices implemented in **VK Post Studio**.

---

## 1. VK API Methods Catalog

All VKontakte API calls use API version **`5.131`** over TLS 1.3.

### 1.1 Account Verification & Target Discovery
| Method | Description | Parameters Used |
|---|---|---|
| `users.get` | Validates access token and resolves owner name for user accounts. | `access_token`, `v` |
| `groups.getById` | Resolves community name and avatar if token belongs to a standalone group. | `access_token`, `v`, `fields=photo_100` |
| `groups.get` | Discovers communities where the authenticated user has administration permissions. | `access_token`, `v`, `filter=admin,editor`, `extended=1`, `fields=photo_100` |

### 1.2 Wall Inspection & Verification
| Method | Description | Parameters Used |
|---|---|---|
| `wall.get` (postponed) | Retrieves the current list of scheduled posts in the VK cloud for a specific target. | `access_token`, `v`, `owner_id`, `filter=postponed`, `count=100` |
| `wall.get` (owner) | Retrieves published posts from the community or user wall with pagination. | `access_token`, `v`, `owner_id`, `filter=owner`, `count=30`, `offset` |
| `wall.getById` | Verifies whether a specific post ID has been published or deleted. | `access_token`, `v`, `posts={owner_id}_{post_id}` |

### 1.3 Photo Upload Pipeline
VKontakte requires a mandatory 3-step handshake to attach media to wall posts:
1. **`photos.getWallUploadServer`**:
   - Acquires a dedicated temporary upload endpoint from VK media servers.
   - Parameters: `access_token`, `v`, `group_id` (if posting to a community).
2. **HTTP Multipart POST to Upload Server**:
   - Streams raw image bytes (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) using `multipart/form-data`.
   - Returns a temporary upload payload containing `{ "server": ..., "photo": "...", "hash": "..." }`.
3. **`photos.saveWallPhoto`**:
   - Commits the uploaded image into VK storage.
   - Parameters: `access_token`, `v`, `server`, `photo`, `hash`, `group_id` or `user_id`.
   - Returns attachment token: `photo{owner_id}_{photo_id}`.

### 1.4 Post Scheduling & Wall Management
| Method | Description | Parameters Used |
|---|---|---|
| `wall.post` | Creates the delayed post on the wall. | `access_token`, `v`, `owner_id`, `message`, `publish_date`, `from_group`, `signed`, `close_comments`, `mute_notifications`, `mark_as_ads`, `attachments`, `primary_attachments_mode`, `guid` |
| `wall.delete` | Deletes a post from the VK wall when reverting or deleting from the app. | `access_token`, `v`, `owner_id`, `post_id` |

---

## 2. Authentication Flow & Token Management

### 2.1 OAuth Implicit Flow
VK Post Studio uses the official VK OAuth Implicit Flow:
```
https://oauth.vk.com/authorize?client_id=6287487&scope=wall,photos,docs,groups,offline&response_type=token&redirect_uri=https://oauth.vk.com/blank.html&display=page
```

### Requested Permissions (`scope`):
- `wall`: Required to schedule, edit, and delete publications on personal walls and managed communities.
- `photos`: Required to request upload servers and save wall attachments.
- `docs`: Required for document/GIF upload capabilities.
- `groups`: Required to list communities where the user is an admin/editor.
- `offline`: Generates a non-expiring access token so users do not need to re-login on every session.

### 2.2 Extraction & Sanitization
When a user approves access, VK redirects to `blank.html#access_token=...`. The built-in token extractor (`extract_clean_token` in `src-tauri/src/commands/account.rs`) handles:
- Full URLs containing query and hash fragments (`#access_token=...&expires_in=0&user_id=...`).
- Direct token strings.
- Strips trailing quotes, semicolons, and parameters.

---

## 3. Rate-Limiting & Anti-Spam Architecture

VKontakte enforces strict rate limits across its API (generally maximum 3–5 requests per second for user tokens). To ensure account safety:

1. **Sequential Queue Transfer**:
   - Posts in the queue are transferred one by one. Images for post $N$ are completely uploaded and saved before post $N+1$ begins.
2. **Randomized Jitter Sleep**:
   - In `transfer_worker.rs`, after each scheduled post, the worker executes:
     ```rust
     let jitter = (rand::random::<u64>() % 3) + 2; // 2 to 4 seconds
     tokio::time::sleep(Duration::from_secs(jitter)).await;
     ```
   - This randomized delay prevents triggering behavioral anti-spam detection.
3. **Idempotency via GUID**:
   - Each created post receives a unique UUID v4 passed to `wall.post` as `guid`. If a network timeout occurs while VK processed the request, retrying with the same `guid` prevents duplicate posts.

---

## 4. Error Code Handling

The application maps VK API errors into descriptive, user-friendly messages:

| VK Error Code | Meaning | App Mitigation |
|---|---|---|
| **Error 5** | *User authorization failed* | Token expired or IP address changed (e.g. VPN enabled). The app displays a notification prompting the user to refresh their token. |
| **Error 14** | *Captcha needed* | Returned if rate limits are exceeded. The jitter delay mitigates this. |
| **Error 27** | *Group auth restricted* | Certain wall inspection calls require a User token instead of a standalone Community token. The app flags `group_auth_restricted: true` and degrades gracefully. |
| **Error 214** | *Access to adding post denied* | User does not have posting permissions in the target community. |

---

## 5. Security & Privacy Model

- **Token Isolation via OS Keyring (`keyring` crate)**: Sensitive VK Access Tokens are never stored in plain text inside the SQLite database. They are delegated to the native OS credential manager (Windows Credential Manager via `services::token_vault::TokenVault`). The local SQLite database stores only the protected sentinel `token = 'keyring_protected'`, preventing token compromise even if database backup files are exported or shared.
- **Local-First Processing**: No intermediate proxy servers. All requests travel directly from the user's desktop to official VKontakte endpoints (`api.vk.com`, `oauth.vk.com`).
- **Telemetry-Free**: VK Post Studio contains zero tracking, analytics, or external telemetry scripts.
- **Database Boundaries**: All posts, target settings, and queues are stored locally in `%APPDATA%/com.vkpoststudio.app/studio.sqlite` running in WAL mode with active foreign key enforcement.
