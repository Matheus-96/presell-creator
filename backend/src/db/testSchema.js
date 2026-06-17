// Applies the full database schema to a given db instance.
// Used exclusively by db/connection.js in NODE_ENV=test to set up
// in-memory databases without going through migrations.js (which would
// be intercepted by jest.doMock in route tests).
function applyTestSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS presells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      template TEXT NOT NULL DEFAULT 'advertorial',
      title TEXT NOT NULL,
      headline TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      body TEXT DEFAULT '',
      bullets TEXT DEFAULT '',
      cta_text TEXT NOT NULL DEFAULT 'Continuar',
      affiliate_url TEXT NOT NULL,
      image_path TEXT DEFAULT '',
      settings_json TEXT NOT NULL DEFAULT '{}',
      google_pixel TEXT DEFAULT NULL,
      background_image_path TEXT DEFAULT NULL,
      tracking_param TEXT NOT NULL DEFAULT 'gclid',
      theme TEXT,
      gallery_images TEXT,
      legal_text TEXT DEFAULT '',
      rendered_html TEXT DEFAULT NULL,
      google_ads_cta_label TEXT DEFAULT NULL,
      google_ads_pageview_label TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key TEXT NOT NULL UNIQUE,
      params_json TEXT NOT NULL DEFAULT '{}',
      referrer TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_hash TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presell_id INTEGER,
      session_key TEXT DEFAULT '',
      event_type TEXT NOT NULL,
      params_json TEXT NOT NULL DEFAULT '{}',
      referrer TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_hash TEXT DEFAULT '',
      country TEXT DEFAULT NULL,
      device_type TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (presell_id) REFERENCES presells(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      result TEXT,
      error TEXT,
      error_code TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS presells_v2 (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT NOT NULL UNIQUE,
      affiliate_url TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      rendered_html TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_presells_slug ON presells(slug);
    CREATE INDEX IF NOT EXISTS idx_events_presell_type ON events(presell_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_session_id ON jobs(session_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
    CREATE INDEX IF NOT EXISTS idx_presells_v2_slug ON presells_v2(slug);
  `);
}

module.exports = { applyTestSchema };
