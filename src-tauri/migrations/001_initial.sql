CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'community')),
    owner_id INTEGER NOT NULL,
    screen_name TEXT,
    title TEXT NOT NULL,
    photo_url TEXT,
    can_post INTEGER NOT NULL DEFAULT 1,
    supports_delayed INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
    times_json TEXT NOT NULL,
    days_json TEXT NOT NULL DEFAULT '["mon","tue","wed","thu","fri","sat","sun"]',
    max_posts_per_day INTEGER,
    min_interval_minutes INTEGER NOT NULL DEFAULT 30,
    author_name TEXT,
    use_vk_signed INTEGER NOT NULL DEFAULT 0,
    jitter_min_sec INTEGER NOT NULL DEFAULT 5,
    jitter_max_sec INTEGER NOT NULL DEFAULT 15,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    pattern_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    scheduled_at_utc TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'queued',
        'transferring',
        'transferred_to_vk',
        'failed',
        'archived'
    )) DEFAULT 'queued',
    guid TEXT NOT NULL UNIQUE,
    author_name TEXT,
    vk_post_id INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    local_path TEXT,
    file_name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    attachment_kind TEXT NOT NULL CHECK (attachment_kind IN ('photo', 'doc')),
    upload_status TEXT NOT NULL CHECK (upload_status IN ('pending', 'uploaded', 'error')) DEFAULT 'pending',
    vk_attachment_string TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_target_status ON posts(target_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at_utc);
CREATE INDEX IF NOT EXISTS idx_attachments_post ON attachments(post_id);