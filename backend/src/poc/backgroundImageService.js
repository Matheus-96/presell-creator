'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { uploadDir } = require('../services/uploadService');
const { createUpload } = require('../repositories/uploadRepository');
const { processImageFile } = require('../services/imageProcessor');

const DOWNLOAD_TIMEOUT_MS = 8_000;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const THUMB_MAX_WIDTH = 400;
const THUMB_QUALITY = 70;

const CONTENT_TYPE_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Keywords that suggest a hero/banner/background image in the URL path. */
const HERO_URL_KEYWORDS = ['hero', 'banner', 'header', 'cover', 'bg', 'background'];

/** Keywords that suggest a logo or icon — used to skip small/decorative images. */
const LOGO_URL_KEYWORDS = ['logo', 'icon', 'favicon', 'sprite', 'avatar'];

/**
 * Picks the best candidate URL from pageData for a background image.
 * Priority:
 *   1. pageData.ogImage
 *   2. First imageUrl whose path contains a hero/banner keyword
 *   3. First imageUrl that is not flagged as a logo/icon
 *
 * @param {object} pageData
 * @returns {string|null}
 */
function pickCandidateUrl(pageData) {
  if (pageData.ogImage && typeof pageData.ogImage === 'string') {
    return pageData.ogImage;
  }

  const imageUrls = Array.isArray(pageData.imageUrls) ? pageData.imageUrls : [];

  // Prefer URLs with hero/banner keywords
  for (const url of imageUrls) {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      if (HERO_URL_KEYWORDS.some(kw => pathname.includes(kw))) {
        return url;
      }
    } catch {
      // skip malformed URLs
    }
  }

  // Fall back to first image that is not a logo/icon
  for (const url of imageUrls) {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      if (!LOGO_URL_KEYWORDS.some(kw => pathname.includes(kw))) {
        return url;
      }
    } catch {
      // skip malformed URLs
    }
  }

  return null;
}

/**
 * Downloads a single image URL and returns its raw buffer and file extension.
 *
 * @param {string} url
 * @param {string} referer
 * @returns {Promise<{ buffer: Buffer, ext: string, contentType: string }>}
 */
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
  if (buffer.byteLength > MAX_SIZE_BYTES) throw new Error('Image too large (>5MB)');

  return { buffer, ext, contentType };
}

/**
 * Extracts a representative background image from the destination page,
 * saves the full-res version to storage/uploads/ (and registers it in the DB),
 * and returns a resized thumbnail as both a hosted URL and a base64 data URI.
 *
 * @param {object} pageData - Data returned by the page extractor
 * @param {string} pageUrl  - The original page URL (used as Referer)
 * @returns {Promise<{ hostedUrl: string, base64: string }|null>}
 */
async function extractAndHostBackgroundImage(pageData, pageUrl) {
  try {
    const candidateUrl = pickCandidateUrl(pageData);
    if (!candidateUrl) return null;

    const absoluteUrl = new URL(candidateUrl, pageUrl).href;
    const { buffer, ext, contentType } = await downloadImage(absoluteUrl, pageUrl);

    // Build filename and save full-res file
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e6);
    const filename = `bg-${timestamp}-${random}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const finalPath = await processImageFile(filePath, 'background');
    const finalFilename = path.basename(finalPath);
    const finalSize = fs.statSync(finalPath).size;

    // Register in uploads DB so it appears in the media gallery
    createUpload({
      originalname: finalFilename,
      filename: finalFilename,
      mimetype: 'image/webp',
      size: finalSize,
    });

    // Generate resized thumbnail via sharp
    const thumbBuffer = await sharp(buffer)
      .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;

    return {
      hostedUrl: `/media/${finalFilename}`,
      base64,
    };
  } catch {
    // Always fail silently — background image is non-critical
    return null;
  }
}

module.exports = { extractAndHostBackgroundImage };
