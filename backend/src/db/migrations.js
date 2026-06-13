const { db } = require("./connection");

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  runMigration("001_initial_schema", `
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

    CREATE INDEX IF NOT EXISTS idx_presells_slug ON presells(slug);
    CREATE INDEX IF NOT EXISTS idx_events_presell_type ON events(presell_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
  `);

  runMigration("002_add_google_pixel_column", `
    ALTER TABLE presells ADD COLUMN google_pixel TEXT DEFAULT NULL;
  `);

  runMigration("003_add_background_image_column", `
    ALTER TABLE presells ADD COLUMN background_image_path TEXT DEFAULT NULL;
  `);

  runMigration("004_presell_tracking_param", `
    ALTER TABLE presells ADD COLUMN tracking_param TEXT NOT NULL DEFAULT 'gclid';
  `);

  runMigration("005_add_theme_to_presells", `
    ALTER TABLE presells ADD COLUMN theme TEXT;
  `);

  runMigration("006_jobs", `
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      result TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_session_id ON jobs(session_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
  `);

  runMigration("007_add_gallery_images", `
    ALTER TABLE presells ADD COLUMN gallery_images TEXT;
  `);

  runMigration("008_jobs_error_code", `
    ALTER TABLE jobs ADD COLUMN error_code TEXT DEFAULT NULL;
  `);

  runMigration("009_add_legal_text", `
    ALTER TABLE presells ADD COLUMN legal_text TEXT DEFAULT '';
  `);

  runMigration("010_add_rendered_html", `
    ALTER TABLE presells ADD COLUMN rendered_html TEXT DEFAULT NULL;
  `);

  runMigration("011_events_country_device", `
    ALTER TABLE events ADD COLUMN country TEXT DEFAULT NULL;
    ALTER TABLE events ADD COLUMN device_type TEXT DEFAULT NULL;
  `);

  runMigration("012_add_google_ads_labels", `
    ALTER TABLE presells ADD COLUMN google_ads_cta_label TEXT DEFAULT NULL;
    ALTER TABLE presells ADD COLUMN google_ads_pageview_label TEXT DEFAULT NULL;
  `);

  runMigration("013_presells_v2", `
    CREATE TABLE IF NOT EXISTS presells_v2 (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT NOT NULL UNIQUE,
      affiliate_url TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      rendered_html TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_presells_v2_slug ON presells_v2(slug);
  `);
}

function runMigration(name, sql) {
  const exists = db
    .prepare("SELECT id FROM schema_migrations WHERE name = ?")
    .get(name);

  if (exists) return;

  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(name);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

module.exports = { migrate };
