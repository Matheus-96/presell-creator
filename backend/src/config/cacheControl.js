const path = require("path");

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_DAY_SECONDS = 24 * ONE_HOUR_SECONDS;
const THIRTY_DAYS_SECONDS = 30 * ONE_DAY_SECONDS;
const ONE_YEAR_SECONDS = 365 * ONE_DAY_SECONDS;

const MARKUP_EXTENSIONS = new Set([".html"]);
const MEDIUM_TTL_EXTENSIONS = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".json",
  ".map",
  ".png",
  ".svg",
  ".ttf",
  ".otf",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2"
]);
const FINGERPRINTED_ASSET_PATTERN = /-[A-Za-z0-9_-]{8,}\.[^.]+$/;

function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function isFingerprintedAsset(filePath) {
  return FINGERPRINTED_ASSET_PATTERN.test(path.basename(filePath));
}

function buildHeaders(cacheControl) {
  return { "Cache-Control": cacheControl };
}

function applyHeaders(res, headers) {
  Object.entries(headers).forEach(([name, value]) => {
    res.setHeader(name, value);
  });
}

function resolveStaticCacheControl(filePath) {
  const extension = getExtension(filePath);

  if (MARKUP_EXTENSIONS.has(extension)) {
    return "no-cache";
  }

  if (isFingerprintedAsset(filePath)) {
    return `public, max-age=${ONE_YEAR_SECONDS}, immutable`;
  }

  if (MEDIUM_TTL_EXTENSIONS.has(extension)) {
    return `public, max-age=${ONE_DAY_SECONDS}`;
  }

  return `public, max-age=${ONE_HOUR_SECONDS}, must-revalidate`;
}

function getStaticAssetCacheHeaders(filePath) {
  return buildHeaders(resolveStaticCacheControl(filePath));
}

function getAdminFrontendCacheHeaders(filePath) {
  return buildHeaders(resolveStaticCacheControl(filePath));
}

function getMediaCacheHeaders() {
  return buildHeaders(`public, max-age=${THIRTY_DAYS_SECONDS}, immutable`);
}

function setStaticAssetCacheHeaders(res, filePath) {
  applyHeaders(res, getStaticAssetCacheHeaders(filePath));
}

function setAdminFrontendCacheHeaders(res, filePath) {
  applyHeaders(res, getAdminFrontendCacheHeaders(filePath));
}

function setMediaCacheHeaders(res) {
  applyHeaders(res, getMediaCacheHeaders());
}

module.exports = {
  getAdminFrontendCacheHeaders,
  getMediaCacheHeaders,
  getStaticAssetCacheHeaders,
  setAdminFrontendCacheHeaders,
  setMediaCacheHeaders,
  setStaticAssetCacheHeaders
};
