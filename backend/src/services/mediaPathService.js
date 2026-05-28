const path = require("path");

function normalizeMediaPath(value) {
  if (typeof value !== "string") {
    return "";
  }

  let normalized = value.trim();
  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return "";
    }
  }

  normalized = normalized
    .split(/[?#]/, 1)[0]
    .replace(/\\/g, "/")
    .replace(/^\/+/, "/");

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the raw value when it is not URI encoded.
  }

  if (normalized.startsWith("/media/")) {
    normalized = normalized.slice("/media/".length);
  }

  return path.posix.basename(normalized);
}

function buildMediaUrl(value) {
  const fileName = normalizeMediaPath(value);
  return fileName ? `/media/${encodeURIComponent(fileName)}` : "";
}

module.exports = {
  normalizeMediaPath,
  buildMediaUrl
};
