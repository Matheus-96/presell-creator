const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { resolveFromRepoRoot } = require("../config/paths");

const storageDir = resolveFromRepoRoot("storage");
fs.mkdirSync(storageDir, { recursive: true });

const dbPath = resolveFromRepoRoot("storage", "database.sqlite");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

module.exports = { db, dbPath };
