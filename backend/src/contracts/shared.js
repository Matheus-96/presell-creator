const ADMIN_API_VERSION = "2026-05-04";
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

const apiErrorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {
          type: "object",
          additionalProperties: true
        },
        requestId: { type: ["string", "null"] }
      }
    }
  }
};

function buildApiError(code, message, details = {}, requestId = null) {
  const error = { code, message };

  if (details && Object.keys(details).length > 0) {
    error.details = details;
  }

  if (requestId) {
    error.requestId = requestId;
  }

  return { error };
}

function getPageLimit(rawLimit) {
  const parsed = Number(rawLimit);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_PAGE_LIMIT);
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function createPageInfo({ limit, nextCursor = null, hasMore = false }) {
  return {
    limit,
    nextCursor,
    hasMore
  };
}

function toInteger(value, fallback = null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

module.exports = {
  ADMIN_API_VERSION,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  apiErrorSchema,
  buildApiError,
  getPageLimit,
  encodeCursor,
  decodeCursor,
  createPageInfo,
  toInteger
};
