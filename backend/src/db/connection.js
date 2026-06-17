const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { resolveFromRepoRoot } = require("../config/paths");

const isTest = (process.env.NODE_ENV || "").trim().toLowerCase() === "test";

let db;
let dbPath;

if (isTest) {
  // In-memory DB per worker: no file conflicts, no WAL/SHM issues.
  // Schema is applied via testSchema.js (not migrations.js) so that
  // jest.doMock("../db/migrations") in route tests cannot interfere.
  dbPath = ":memory:";
  db = new DatabaseSync(dbPath);
  const { applyTestSchema } = require("./testSchema");
  applyTestSchema(db);
} else {
  const storageDir = resolveFromRepoRoot("storage");
  fs.mkdirSync(storageDir, { recursive: true });
  dbPath = resolveFromRepoRoot("storage", "database.sqlite");
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
}

module.exports = { db, dbPath };
