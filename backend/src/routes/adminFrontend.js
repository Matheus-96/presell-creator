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

/**
 * Returns an Express router that serves the SPA index.html for all GET
 * requests under /p/*. No static assets — only the entry point so the React
 * Router can take over client-side.
 */
function createPublicPresellSpaHandler() {
  const router = express.Router();

  router.get("*", (req, res) => {
    res.sendFile(frontendDistIndexFile, {
      headers: getAdminFrontendCacheHeaders(frontendDistIndexFile)
    });
  });

  return router;
}

module.exports = {
  createAdminFrontendRouter,
  createPublicPresellSpaHandler,
  hasBuiltAdminFrontend
};
