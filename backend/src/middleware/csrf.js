const crypto = require("crypto");
const { buildApiError } = require("../contracts/shared");

function createCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function tokensMatch(token, sessionToken) {
  if (!token || !sessionToken) {
    return false;
  }

  const actual = Buffer.from(String(token));
  const expected = Buffer.from(String(sessionToken));

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function ensureCsrfToken(req) {
  if (!req.session) {
    return null;
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = createCsrfToken();
  }

  return req.session.csrfToken;
}

function attachCsrf(req, res, next) {
  res.locals.csrfToken = ensureCsrfToken(req);
  next();
}

function getCsrfTokenFromRequest(req) {
  return (req.body && req.body._csrf)
    || req.headers["x-csrf-token"]
    || req.headers["x-csrftoken"]
    || (req.body && req.body.csrfToken)
    || null;
}

function getCsrfFailure(req) {
  const token = getCsrfTokenFromRequest(req);
  const sessionToken = req.session && req.session.csrfToken;

  if (!token) {
    return {
      code: "csrf_required",
      message: "A CSRF token is required for this request.",
      legacyMessage: "Token CSRF ausente.",
      logReason: "no token provided"
    };
  }

  if (!tokensMatch(token, sessionToken)) {
    return {
      code: "csrf_invalid",
      message: "The supplied CSRF token is invalid or expired.",
      legacyMessage: "Token CSRF inválido.",
      logReason: "token mismatch"
    };
  }

  return null;
}

function logCsrfFailure(req, reason) {
  console.warn(`CSRF validation failed: ${reason}`, {
    path: req.path,
    method: req.method,
    hasSession: Boolean(req.session),
    hasSessionToken: Boolean(req.session && req.session.csrfToken),
    sessionId: req.sessionID ? req.sessionID.substring(0, 8) : "none"
  });
}

function verifyCsrf(req, res, next) {
  const failure = getCsrfFailure(req);

  if (!failure) {
    return next();
  }

  logCsrfFailure(req, failure.logReason);
  return res.status(403).json({ error: failure.legacyMessage });
}

function verifyApiCsrf(req, res, next) {
  const failure = getCsrfFailure(req);

  if (!failure) {
    return next();
  }

  logCsrfFailure(req, failure.logReason);
  return res.status(403).json(buildApiError(failure.code, failure.message));
}

module.exports = {
  attachCsrf,
  createCsrfToken,
  ensureCsrfToken,
  getCsrfTokenFromRequest,
  verifyCsrf,
  verifyApiCsrf
};
