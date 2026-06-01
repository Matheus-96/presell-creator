'use strict';

/**
 * Builds the extractedImages array from page data.
 * Returns raw image URLs with type hints so the frontend can let the user
 * pick which ones to download — no network calls happen here.
 *
 * Types:
 *   'hero'       — first candidate image (likely the product hero)
 *   'background' — explicit background URL (ogImage / CSS background)
 *   'generic'    — remaining images
 *
 * @param {object} pageData
 * @param {string[]} [pageData.imageUrls]
 * @param {string}   [pageData.backgroundImageUrl]
 * @returns {{ url: string, type: 'hero' | 'background' | 'generic' }[]}
 */
function buildExtractedImages(pageData) {
  const imageUrls = Array.isArray(pageData.imageUrls) ? pageData.imageUrls : [];
  const backgroundImageUrl = typeof pageData.backgroundImageUrl === 'string'
    ? pageData.backgroundImageUrl
    : null;

  const result = [];
  const seen = new Set();

  // If there is a dedicated background URL, add it first and mark as seen
  // so it won't be re-added from imageUrls.
  if (backgroundImageUrl) {
    result.push({ url: backgroundImageUrl, type: 'background' });
    seen.add(backgroundImageUrl);
  }

  // Walk through imageUrls assigning hero to the first, generic to the rest.
  let heroAssigned = false;
  for (const url of imageUrls) {
    if (seen.has(url)) continue;
    seen.add(url);

    if (!heroAssigned) {
      result.push({ url, type: 'hero' });
      heroAssigned = true;
    } else {
      result.push({ url, type: 'generic' });
    }
  }

  return result;
}

module.exports = { buildExtractedImages };
