const crypto = require("crypto");

const TRACKING_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id"
];

function collectTrackingParams(query) {
  const params = {};
  for (const key of TRACKING_PARAMS) {
    if (typeof query[key] === "string" && query[key].trim() !== "") {
      const value = query[key].trim();
      // Validate parameter length (max 100 chars), especially important for gclid
      if (value.length <= 100) {
        params[key] = value;
      }
    }
  }
  return params;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}

function hashIp(ip) {
  if (!ip) return "";
  return crypto.createHash("sha256").update(ip).digest("hex");
}

module.exports = { TRACKING_PARAMS, collectTrackingParams, getClientIp, hashIp };
