const express = require("express");
const fs = require("fs");
const path = require("path");

const { frontendDistDir, frontendDistIndexFile } = require("../config/paths");

function hasBuiltAdminFrontend() {
  return fs.existsSync(frontendDistIndexFile);
}

function createAdminFrontendRouter() {
  const router = express.Router();

  router.use(express.static(frontendDistDir, {
    fallthrough: true,
    index: false
  }));

  router.get("*", (req, res, next) => {
    if (path.extname(req.path)) {
      return next();
    }

    return res.sendFile(frontendDistIndexFile);
  });

  return router;
}

module.exports = {
  createAdminFrontendRouter,
  hasBuiltAdminFrontend
};
