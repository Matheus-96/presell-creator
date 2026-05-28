const { db } = require("../db/connection");

const createUploadStmt = db.prepare(`
  INSERT INTO uploads (original_name, file_name, mime_type, size)
  VALUES (?, ?, ?, ?)
`);

function createUpload(file) {
  createUploadStmt.run(file.originalname, file.filename, file.mimetype, file.size);
}

module.exports = { createUpload };
