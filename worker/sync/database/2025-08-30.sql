PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users(
    key TEXT UNIQUE PRIMARY KEY NOT NULL, -- Long Hex String (182 chars)
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DROP TABLE IF EXISTS invitations;
CREATE TABLE IF NOT EXISTS invitations(
    id TEXT UNIQUE PRIMARY KEY NOT NULL, -- UUID
    instance TEXT NOT NULL, -- Durable Object Instance ID
    invitee TEXT NOT NULL, -- User Being Invited
    inviter TEXT NOT NULL,  -- User Sending the Invite
    role TEXT NOT NULL,  -- Role being granted (either "none", or "admin", for now)
    accepted INTEGER DEFAULT FALSE, 
    sku TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (invitee) REFERENCES users(key) ON DELETE CASCADE,
    FOREIGN KEY (inviter) REFERENCES users(key) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_invitations_sku ON invitations(sku);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON invitations(invitee);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter);

DROP TABLE IF EXISTS assets;
CREATE TABLE IF NOT EXISTS assets(
    id  TEXT UNIQUE PRIMARY KEY NOT NULL, -- UUID
    type TEXT NOT NULL,
    owner TEXT NOT NULL,
    sku TEXT NOT NULL,
    images_id TEXT, -- Cloudflare Images ID

    FOREIGN KEY (owner) REFERENCES users(key)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner);
CREATE INDEX IF NOT EXISTS idx_assets_sku ON assets(type);


DROP TABLE IF EXISTS key_exchange;
CREATE TABLE IF NOT EXISTS key_exchange(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    sku TEXT NOT NULL,
    key TEXT NOT NULL,
    version TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_key_exchange_code_sku ON key_exchange(code, sku);

PRAGMA foreign_keys=ON;
