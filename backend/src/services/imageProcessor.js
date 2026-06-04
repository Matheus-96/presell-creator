'use strict';

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const PROFILES = {
  product:    { maxWidth: 1200, quality: 82 },
  background: { maxWidth: 1920, quality: 65 },
  default:    { maxWidth: 1200, quality: 75 },
};

/**
 * Compresses an image file in-place using sharp.
 * Converts to WebP, resizes if wider than the profile max, deletes the original.
 * Returns the new file path (extension may change to .webp).
 * GIFs are skipped and the original path is returned unchanged.
 */
async function processImageFile(filePath, purpose) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.gif') return filePath;

  const profile = PROFILES[purpose] || PROFILES.default;
  const newPath = filePath.replace(/\.[^.]+$/, '.webp');

  await sharp(filePath)
    .resize({ width: profile.maxWidth, withoutEnlargement: true })
    .webp({ quality: profile.quality })
    .toFile(newPath);

  await fs.promises.unlink(filePath);
  return newPath;
}

/**
 * Wraps processImageFile for multer file objects.
 * Returns an updated file descriptor with the new path, filename, mimetype and size.
 */
async function processUploadedImage(file, purpose) {
  const ext = path.extname(file.filename).toLowerCase();
  if (ext === '.gif') return file;

  const newPath = await processImageFile(file.path, purpose);
  const newFilename = path.basename(newPath);

  return {
    ...file,
    filename: newFilename,
    path: newPath,
    mimetype: 'image/webp',
    originalname: file.originalname.replace(/\.[^.]+$/, '.webp'),
    size: (await fs.promises.stat(newPath)).size,
  };
}

module.exports = { processImageFile, processUploadedImage };
