-- TempBox SQLite / Cloudflare D1 Schema

CREATE TABLE IF NOT EXISTS mailboxes (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  alias TEXT NOT NULL,
  domain TEXT NOT NULL,
  token TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  telegram_user_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ttl_seconds INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_address ON mailboxes(address);
CREATE INDEX IF NOT EXISTS idx_mailboxes_token ON mailboxes(token);
CREATE INDEX IF NOT EXISTS idx_mailboxes_expires_at ON mailboxes(expires_at);
CREATE INDEX IF NOT EXISTS idx_mailboxes_tg_user ON mailboxes(telegram_user_id);

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  from_name TEXT,
  from_address TEXT NOT NULL,
  to_addresses TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_content TEXT,
  html_content TEXT,
  headers_json TEXT NOT NULL,
  spf TEXT,
  dkim TEXT,
  dmarc TEXT,
  attachments_json TEXT,
  otp_code TEXT,
  otp_kind TEXT,
  otp_confidence REAL,
  otp_snippet TEXT,
  received_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_messages_mailbox_id ON email_messages(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_expires_at ON email_messages(expires_at);

CREATE TABLE IF NOT EXISTS webhook_requests (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  query_params_json TEXT NOT NULL,
  headers_json TEXT NOT NULL,
  body_json TEXT,
  raw_body TEXT,
  ip_address TEXT,
  received_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_requests_mailbox_id ON webhook_requests(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_webhook_requests_expires_at ON webhook_requests(expires_at);
