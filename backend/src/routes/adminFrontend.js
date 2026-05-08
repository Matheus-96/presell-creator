const express = require("express");
const fs = require("fs");
const path = require("path");

const { getAdminFrontendCacheHeaders, setAdminFrontendCacheHeaders } = require("../config/cacheControl");
const { frontendDistDir, frontendDistIndexFile } = require("../config/paths");

function hasBuiltAdminFrontend() {
  return fs.existsSync(frontendDistIndexFile);
}

function createAdminFrontendRouter() {
  const router = express.Router();

  router.use(express.static(frontendDistDir, {
    fallthrough: true,
    index: false,
    setHeaders: setAdminFrontendCacheHeaders
  }));

  router.get("*", (req, res, next) => {
    if (path.extname(req.path)) {
      return next();
    }

    return res.sendFile(frontendDistIndexFile, {
      headers: getAdminFrontendCacheHeaders(frontendDistIndexFile)
    });
  });

  return router;
}

module.exports = {
  createAdminFrontendRouter,
  hasBuiltAdminFrontend
};
