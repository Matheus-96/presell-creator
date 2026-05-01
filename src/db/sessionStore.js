const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const storageDir = path.join(__dirname, "..", "..", "storage");
fs.mkdirSync(storageDir, { recursive: true });

const sessionDbPath = path.join(storageDir, "sessions.sqlite");
const sessionDb = new DatabaseSync(sessionDbPath);

sessionDb.exec("PRAGMA journal_mode = WAL;");
sessionDb.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires INTEGER
  )
`);

const { Store } = session;

class SQLiteSessionStore extends Store {
  constructor(options) {
    super(options);
    this._stmtGet = sessionDb.prepare("SELECT data FROM sessions WHERE sid = ? AND (expires IS NULL OR expires > ?)");
    this._stmtSet = sessionDb.prepare("INSERT OR REPLACE INTO sessions (sid, data, expires) VALUES (?, ?, ?)");
    this._stmtDestroy = sessionDb.prepare("DELETE FROM sessions WHERE sid = ?");
    this._stmtAll = sessionDb.prepare("SELECT data FROM sessions WHERE expires IS NULL OR expires > ?");
    this._stmtCleanup = sessionDb.prepare("DELETE FROM sessions WHERE expires IS NOT NULL AND expires <= ?");

    // Clean up expired sessions every 15 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 15 * 60 * 1000);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  get(sid, callback) {
    try {
      const now = Date.now();
      const row = this._stmtGet.get(sid, now);
      if (row) {
        callback(null, JSON.parse(row.data));
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  set(sid, session, callback) {
    try {
      const data = JSON.stringify(session);
      const expires = session.cookie && session.cookie.expires
        ? new Date(session.cookie.expires).getTime()
        : null;
      this._stmtSet.run(sid, data, expires);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      this._stmtDestroy.run(sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  all(callback) {
    try {
      const now = Date.now();
      const rows = this._stmtAll.all(now);
      const sessions = rows.map((r) => JSON.parse(r.data));
      callback(null, sessions);
    } catch (err) {
      callback(err);
    }
  }

  _cleanup() {
    try {
      this._stmtCleanup.run(Date.now());
    } catch (_) {
      // ignore cleanup errors
    }
  }
}

module.exports = { SQLiteSessionStore };
