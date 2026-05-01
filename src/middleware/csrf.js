const crypto = require("crypto");

function attachCsrf(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrf(req, res, next) {
  const token = req.body && req.body._csrf;
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).send("Token CSRF invalido.");
  }

  next();
}

module.exports = { attachCsrf, verifyCsrf };
