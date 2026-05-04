const { getEnv } = require("../config/env");
const { verifyAdminPassword } = require("../middleware/auth");
const { createCsrfToken } = require("../middleware/csrf");

function authenticateAdminCredentials({ username, password }) {
  const { adminPasswordHash, adminUser } = getEnv();

  return username === adminUser
    && verifyAdminPassword(password, adminPasswordHash);
}

function rotateAdminSession(req, { isAdmin = false } = {}, callback) {
  req.session.regenerate((error) => {
    if (error) {
      callback(error);
      return;
    }

    req.session.csrfToken = createCsrfToken();
    req.session.isAdmin = Boolean(isAdmin);

    req.session.save((saveError) => {
      callback(saveError || null);
    });
  });
}

module.exports = {
  authenticateAdminCredentials,
  rotateAdminSession
};
