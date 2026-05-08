const rateLimit = require("express-rate-limit");

const { buildApiError } = require("../contracts/shared");

const WINDOW_MS = 60 * 1000;
const RETRY_AFTER_SECONDS = Math.ceil(WINDOW_MS / 1000);

function createPublicRateLimit(identifier, limit) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    identifier,
    handler: (req, res) => {
      res.status(429).json(buildApiError(
        "rate_limit_exceeded",
        "Too many requests. Please retry shortly.",
        { retryAfterSeconds: RETRY_AFTER_SECONDS }
      ));
    }
  });
}

const publicEventRateLimit = createPublicRateLimit("public-analytics-events", 120);
const publicRedirectRateLimit = createPublicRateLimit("public-redirect-resolution", 240);

module.exports = {
  publicEventRateLimit,
  publicRedirectRateLimit
};
