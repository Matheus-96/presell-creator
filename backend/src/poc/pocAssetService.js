'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../services/uploadService');
const { processImageFile } = require('../services/imageProcessor');

const MAX_IMAGES = 5;
const DOWNLOAD_TIMEOUT_MS = 8_000;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPE_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function urlHash(url) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function findExistingFile(hash) {
  for (const ext of Object.values(CONTENT_TYPE_EXT)) {
    const filename = `poc-${hash}${ext}`;
    if (fs.existsSync(path.join(uploadDir, filename))) return filename;
  }
  return null;
}

async function downloadImage(url, referer) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': referer,
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
  const ext = CONTENT_TYPE_EXT[contentType];
  if (!ext) throw new Error(`Unsupported content-type: ${contentType}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_SIZE_BYTES) throw new Error('Image too large');

  return { buffer, ext };
}

/**
 * Baixa até MAX_IMAGES URLs, salva em storage/uploads e retorna URLs /media/... hospedadas.
 * Reutiliza arquivo existente se a mesma URL já foi baixada antes (deduplicação por URL).
 * Falhas individuais são ignoradas silenciosamente.
 *
 * @param {string[]} imageUrls
 * @param {string} pageUrl - usado como Referer e base para resolver URLs relativas
 * @returns {Promise<string[]>}
 */
async function downloadAndHostImages(imageUrls, pageUrl, purpose = 'default') {
  const toProcess = imageUrls.slice(0, MAX_IMAGES);
  const hosted = [];

  for (const rawUrl of toProcess) {
    try {
      const absoluteUrl = new URL(rawUrl, pageUrl).href;
      const hash = urlHash(absoluteUrl);

      const existing = findExistingFile(hash);
      if (existing) {
        hosted.push(`/media/${existing}`);
        continue;
      }

      const { buffer, ext } = await downloadImage(absoluteUrl, pageUrl);
      const rawFilename = `poc-${hash}${ext}`;
      const rawFilePath = path.join(uploadDir, rawFilename);
      fs.writeFileSync(rawFilePath, buffer);

      const finalPath = await processImageFile(rawFilePath, purpose);
      hosted.push(`/media/${path.basename(finalPath)}`);
    } catch {
      // skip failures silently
    }
  }

  return hosted;
}

module.exports = { downloadAndHostImages };
