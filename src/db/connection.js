const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const storageDir = path.join(__dirname, "..", "..", "storage");
fs.mkdirSync(storageDir, { recursive: true });

const dbPath = path.join(storageDir, "database.sqlite");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

module.exports = { db, dbPath };
