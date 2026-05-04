const crypto = require("crypto");
const { buildApiError } = require("../contracts/shared");
const { getAdminPathConfig } = require("../services/adminPathService");

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  const { buildLegacyAdminPath } = getAdminPathConfig();
  res.redirect(buildLegacyAdminPath("/login"));
}

function requireApiAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();

  return res.status(401).json(buildApiError(
    "auth_required",
    "Authentication is required for this endpoint."
  ));
}

function verifyAdminPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.startsWith("scrypt:")) {
    return false;
  }

  const [, n, r, p, salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;

  const actual = crypto.scryptSync(password, salt, 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024
  });
  const expected = Buffer.from(expectedHex, "hex");

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { requireAuth, requireApiAuth, verifyAdminPassword };
