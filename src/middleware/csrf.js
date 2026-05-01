const crypto = require("crypto");

function attachCsrf(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrf(req, res, next) {
  // Procura token em múltiplas locais (body, header, JSON body)
  const token = (req.body && req.body._csrf) // Form POST
    || req.headers['x-csrf-token'] // AJAX header
    || req.headers['x-csrftoken'] // Alternativa
    || (req.body && req.body.csrfToken); // JSON body csrfToken

  const sessionToken = req.session && req.session.csrfToken;

  if (!token) {
    console.warn('CSRF validation failed: no token provided', {
      path: req.path,
      method: req.method,
      hasSession: !!req.session,
      sessionId: req.sessionID ? req.sessionID.substring(0, 8) : 'none'
    });
    return res.status(403).json({ error: "Token CSRF ausente." });
  }

  if (token !== sessionToken) {
    console.warn('CSRF validation failed: token mismatch', {
      path: req.path,
      method: req.method,
      received: `${token.substring(0, 8)}...`,
      expected: sessionToken ? `${sessionToken.substring(0, 8)}...` : 'none',
      sessionId: req.sessionID ? req.sessionID.substring(0, 8) : 'none'
    });
    return res.status(403).json({ error: "Token CSRF inválido." });
  }

  next();
}

module.exports = { attachCsrf, verifyCsrf };
