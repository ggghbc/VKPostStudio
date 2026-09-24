# VK Post Studio — System Architecture

This document provides an in-depth technical analysis of the internal architecture, design patterns, data flow, and database schema powering **VK Post Studio**.

---

## 1. High-Level Architecture Overview

VK Post Studio is built on **Tauri 2.x**, leveraging a decoupled, asynchronous, local-first architecture. It combines a lightweight, native Rust backend with a modern React/TypeScript frontend rendered inside the operating system's native Webview (Microsoft Edge WebView2 on Windows).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                      │
│                                                                        │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │   Header.tsx   │  │ PostCreator.tsx  │  │    QueuePanel.tsx      │  │
│  └───────┬────────┘  └────────┬─────────┘  └───────────┬────────────┘  │
│          │                    │                        │               │
│          └────────────────────┼────────────────────────┘               │
│                               ▼                                        │
│                     API Service (`api.ts`)                             │
│                     I18n Engine (`i18n.ts`)                            │
│                     UI Themes (`index.css`)                            │
└───────────────────────────────┬────────────────────────────────────────┘
                                │  IPC Invoke / Event Stream
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TAURI IPC BRIDGE LAYER                          │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Rust + Tokio)                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Commands: `account.rs` | `pattern.rs` | `post.rs` | `system.rs`  │  │
│  └──────────────┬───────────────────────────────┬───────────────────┘  │
│                 ▼                               ▼                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │   PatternEngine (services)  │  │    TransferWorker (services)    │  │
│  │  - Next slot calculation    │  │  - Sequential photo uploads     │  │
│  │  - TZ & interval handling   │  │  - Scheduled wall post creation │  │
│  └─────────────────────────────┘  │  - Rate-limit jitter (2-4s)     │  │
│                                   └────────────────┬────────────────┘  │
│                                                    │                   │
│                                                    ▼                   │
│                                   ┌─────────────────────────────────┐  │
│                                   │       VkClient (`vk/client.rs`) │  │
│                                   │   HTTPS / Multipart (reqwest)   │  │
│                                   └────────────────┬────────────────┘  │
│                                                    │                   │
│                 ┌──────────────────────────────────┘                   │
│                 ▼                                                      │
│  ┌─────────────────────────────┐                                       │
│  │    SQLite via SQLx Pool     │                                       │
│  │  - accounts, targets,       │                                       │
│  │    patterns, posts, attach  │                                       │
│  └─────────────────────────────┘                                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Modules & Responsibilities

The Rust backend is structured into modular layers under `src-tauri/src`:

### 2.1 Application Entry Point (`lib.rs` & `main.rs`)
- Initializes Tauri plugins: `tauri-plugin-dialog`, `tauri-plugin-fs`.
- Resolves OS application data directories:
  - Base: `%APPDATA%/com.vkpoststudio.app/` (Windows)
  - Thumbnails cache: `%APPDATA%/com.vkpoststudio.app/thumbnails/`
  - Backups: `%APPDATA%/com.vkpoststudio.app/backups/`
  - Clipboard images: `%APPDATA%/com.vkpoststudio.app/pasted_images/`
- Establishes the SQLite connection pool (`SqlitePoolOptions`, max 5 connections) configured with:
  - `PRAGMA foreign_keys = ON;` on every connection.
  - `journal_mode = WAL` (Write-Ahead Logging) for non-blocking concurrent operations.
- Injects `AppState` containing:
  - `db: SqlitePool`: Shared database handle.
  - `active_vk: Arc<Mutex<Option<VkClient>>>`: Mutex-guarded active client for the selected account.
- Registers 30+ IPC commands via `tauri::generate_handler!`.
- Hooks window lifecycle events (`WindowEvent::CloseRequested`) to automatically trigger atomic database backups via SQLite `VACUUM INTO`.

### 2.2 VK API Client (`src/vk/client.rs`)
Encapsulates all direct HTTP interactions with the official VKontakte API:
- **Base Version:** `v=5.131`.
- **Headers:** Custom User-Agent and Accept-Language for realistic browser emulation.
- **Key Methods:**
  - `verify_token()`: Identifies whether an access token belongs to a personal User profile or a standalone Group token.
  - `get_admin_groups()`: Fetches all communities where the token owner has administrator or editor privileges.
  - `get_postponed_posts(owner_id)`: Retrieves scheduled/delayed wall posts directly from the target wall.
  - `get_wall_posts(owner_id, count, offset)`: Queries published wall posts with pagination.
  - `upload_wall_photo(target_owner_id, file_path)`: Implements VK's 3-step photo upload flow:
    1. `photos.getWallUploadServer`: Request upload URL for the target user or community (`group_id`).
    2. `reqwest::multipart`: Stream bytes to upload server.
    3. `photos.saveWallPhoto`: Commit uploaded photo to the account/group album and receive attachment token (`photo{owner_id}_{id}`).
  - `schedule_wall_post(...)`: Submits delayed wall posts with support for carousels (`primary_attachments_mode=carousel`), comments lock, author signatures, ad marks, and notifications toggle.
  - `delete_wall_post(owner_id, post_id)`: Removes posts from the VK wall.

### 2.3 Pattern Engine (`src/services/pattern_engine.rs`)
Calculates optimal future publication timestamps based on configurable rules:
- **Timezone Awareness:** Converts UTC timestamps into local timezone representation (`chrono_tz::Tz`, e.g. `Europe/Moscow`) and back.
- **Interval Days Support:** Configurable frequency:
  - `1`: Daily posting.
  - `2`: Every other day.
  - `N`: Every N days.
- **Slot Search Algorithm:**
  - Evaluates candidates starting from `now + 2 minutes`.
  - Ensures a minimum spacing between consecutive posts (`min_interval_minutes`, minimum 5 min, default 30 min).
  - Handles timezone edge cases (daylight savings transitions, ambiguous local times).

### 2.4 Transfer Pipeline (`src/services/transfer_worker.rs`)
Manages the end-to-end background migration of queued posts to the VK cloud:
- Executed on a spawned Tokio thread to keep IPC responsive.
- Emits real-time progress events over Tauri event channels:
  - `transfer-progress`: Sends current index, total count, and post ID.
  - `transfer-finished`: Signals completion or failure with localized error descriptions.
- Dynamic slot shifting: automatically bumps scheduled time by +2 minutes if the slot timestamp has expired during transmission.
- Reuses previously uploaded attachments if a prior attempt was partially completed.
- Injects a randomized jitter delay (2–4 seconds) between post submissions to avoid triggering VK anti-spam rate limits.

### 2.5 Security Vault & System Services
- **TokenVault (`src/services/token_vault.rs`)**: Integrates with the OS native credential store via the `keyring` crate (Windows Credential Manager). Eliminates plain-text token exposure in SQLite.
- **Native Trash Recycling**: Utilizes the `trash` crate for instant, native recycling of local files via Win32 Shell API (`SHFileOperationW`) without spawning PowerShell processes.

---

## 3. Database Architecture (SQLite)

The local SQLite database schema is defined in `migrations/001_initial.sql`.

```
┌─────────────────────────┐
│        accounts         │
├─────────────────────────┤
│ id (PK)                 │◀──────┐
│ name: TEXT              │       │
│ user_id: INTEGER        │       │
│ token: TEXT             │       │
│ avatar_url: TEXT        │       │
│ is_active: INTEGER      │       │
│ created_at: TEXT        │       │
└─────────────────────────┘       │
             │                    │
             │ 1:N                │ 1:N
             ▼                    │
┌─────────────────────────┐       │
│         targets         │       │
├─────────────────────────┤       │
│ id (PK)                 │       │
│ account_id (FK) ────────┼───────┤
│ target_type: TEXT       │       │
│ owner_id: INTEGER       │       │
│ screen_name: TEXT       │       │
│ title: TEXT             │       │
│ photo_url: TEXT         │       │
│ can_post: INTEGER       │       │
│ supports_delayed: INT   │       │
└─────────────────────────┘       │
             │                    │
             │ 1:N                │
             ▼                    │
┌─────────────────────────┐       │
│          posts          │       │
├─────────────────────────┤       │
│ id (PK)                 │       │
│ account_id (FK) ────────┼───────┘
│ target_id (FK) ─────────┼───────┐
│ pattern_id (FK) ────────┼─┐     │
│ text: TEXT              │ │     │
│ scheduled_at_utc: TEXT  │ │     │
│ status: TEXT            │ │     │
│ guid: TEXT (UNIQUE)     │ │     │
│ author_name: TEXT       │ │     │
│ vk_post_id: INTEGER     │ │     │
│ signed: INTEGER         │ │     │
│ close_comments: INTEGER │ │     │
│ mute_notifications: INT │ │     │
│ mark_as_ads: INTEGER    │ │     │
│ attachments_view_mode   │ │     │
└─────────────────────────┘ │     │
             │              │     │
             │ 1:N          │     │
             ▼              │     │
┌─────────────────────────┐ │     │
│       attachments       │ │     │
├─────────────────────────┤ │     │
│ id (PK)                 │ │     │
│ post_id (FK) ───────────┼─┼─────┘
│ file_name: TEXT         │ │
│ size_bytes: INTEGER     │ │
│ attachment_kind: TEXT   │ │
│ upload_status: TEXT     │ │
│ vk_attachment_string    │ │
│ local_path: TEXT        │ │
│ order_index: INTEGER    │ │
└─────────────────────────┘ │
                            │
┌─────────────────────────┐ │
│        patterns         │ │
├─────────────────────────┤ │
│ id (PK)                 │◀┘
│ name: TEXT              │
│ timezone: TEXT          │
│ times_json: TEXT        │
│ days_json: TEXT         │
│ min_interval_minutes    │
│ interval_days: INTEGER  │
│ is_default: INTEGER     │
└─────────────────────────┘
```

### Table Indexing
- `idx_posts_target_status`: Compound index on `(target_id, status)` for instant queue retrieval.
- `idx_posts_scheduled_at`: Index on `scheduled_at_utc` for sorting chronologically.
- `idx_attachments_post`: Index on `post_id` for fast join of attachments during post card rendering.

---

## 4. Frontend Architecture

The frontend is built using React 19 with functional components, hooks, and clean prop separation:

### 4.1 State Management & Synchronization
- Root state resides in `App.tsx`:
  - Active account, available targets, posting patterns.
  - Active queues (`localPosts`, `vkDelayedPosts`, `historyPosts`).
  - Active editor draft with auto-recovery from `localStorage` (`vk_draft`).
- Real-time event listeners (`listen("tauri://drag-drop")`, `listen("transfer-progress")`).
- Global clipboard listener intercepts pasted images directly in the application window.

### 4.2 Styling & Theming System
- CSS variables defined in `src/index.css` drive all color palettes.
- The `data-theme` attribute on `<html>` dynamically alters CSS custom properties (`--bg-app`, `--bg-surface`, `--accent`, `--border-light`, etc.).
- 6 built-in themes:
  1. `pastel`: Pastel Dreamland Adventure (Soft violet and pink)
  2. `ocean`: Ocean Breeze (Deep midnight cyan and sapphire)
  3. `pink`: Soft Pink Delight (Light floral rose)
  4. `earthy`: Earthy Green (Nordic moss and sage)
  5. `steel`: Light Steel (Minimalist clean monochrome)
  6. `twilight`: Golden Twilight (Obsidian black and gold)

### 4.3 Custom Controls
- `CustomSelect.tsx`: Accessible, stylized replacement for standard HTML selects with drop-up and right-align capability.
- `ContentCalendar.tsx`: Interactive monthly content matrix for visualizing scheduled density.
- `VkSmartPhotoGrid`: Proportional responsive photo layout algorithm matching VK mobile and desktop feed presentation (1 to 10 photos).
