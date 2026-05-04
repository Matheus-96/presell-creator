const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { resolveFromRepoRoot } = require("../config/paths");
const uploadRepository = require("../repositories/uploadRepository");
const { normalizeMediaPath } = require("./mediaPathService");

const uploadDir = resolveFromRepoRoot("storage", "uploads");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
fs.mkdirSync(uploadDir, { recursive: true });

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

const uploadMultiple = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'background_image', maxCount: 1 }
]);

function registerUpload(file) {
  if (!file) return "";

  uploadRepository.createUpload(file);

  return file.filename;
}

function deleteUpload(filename) {
  const normalizedFilename = normalizeMediaPath(filename);
  if (!normalizedFilename) return false;

  try {
    const filePath = path.join(uploadDir, normalizedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting upload:', error);
  }
  return false;
}

module.exports = { upload, uploadMultiple, registerUpload, uploadDir, deleteUpload };
