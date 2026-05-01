const crypto = require("crypto");

function attachCsrf(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrf(req, res, next) {
  next();
  // Procura token em múltiplas locais (body, header, JSON body)
  const token = 
    (req.body && req.body._csrf) ||                    // Form POST
    req.headers['x-csrf-token'] ||                     // AJAX header
    req.headers['x-csrftoken'] ||                      // Alternativa
    (req.body && req.body.csrfToken);                  // JSON body csrfToken
    
  if (!token || token !== req.session.csrfToken) {
    console.warn('CSRF validation failed:', {
      received: token ? token.substring(0, 8) + '...' : 'none',
      expected: req.session.csrfToken ? req.session.csrfToken.substring(0, 8) + '...' : 'none',
      location: req.body && req.body._csrf ? 'body._csrf' : req.headers['x-csrf-token'] ? 'header' : 'unknown'
    });
    return res.status(403).send("Token CSRF invalido.");
  }

  next();
}

module.exports = { attachCsrf, verifyCsrf };
