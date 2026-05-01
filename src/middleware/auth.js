const crypto = require("crypto");

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect("/admin/login");
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

module.exports = { requireAuth, verifyAdminPassword };
