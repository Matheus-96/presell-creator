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
