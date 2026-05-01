const path = require("path");
const multer = require("multer");
const { db } = require("../db/connection");

const uploadDir = path.join(__dirname, "..", "..", "storage", "uploads");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Apenas imagens JPG, PNG, WEBP ou GIF sao permitidas."));
    }
    cb(null, true);
  }
});

function registerUpload(file) {
  if (!file) return "";

  db.prepare(`
    INSERT INTO uploads (original_name, file_name, mime_type, size)
    VALUES (?, ?, ?, ?)
  `).run(file.originalname, file.filename, file.mimetype, file.size);

  return file.filename;
}

module.exports = { upload, registerUpload, uploadDir };
