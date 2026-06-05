const express = require("express");
const fs = require("fs");
const path = require("path");

const { getAdminFrontendCacheHeaders, setAdminFrontendCacheHeaders } = require("../config/cacheControl");
const { frontendDistDir, frontendDistIndexFile } = require("../config/paths");
const { getPublishedPresell } = require("../services/presellService");
const { notify } = require("../services/telegram.service");

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

// Serve o HTML estático gerado para o presell (SSR). Quando o presell não tem
// HTML gerado (legado), faz fallback para o index.html da SPA.
function createPublicPresellHandler() {
  const router = express.Router();

  router.get("/:slug", (req, res) => {
    const presell = getPublishedPresell(req.params.slug);

    if (!presell) {
      return res.status(404).render("presell/404", {
        title: "Presell nao encontrada",
        pixelHtml: ""
      });
    }

    if (presell.rendered_html) {
      notify("presell.page_view", { title: presell.title, slug: presell.slug });
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(presell.rendered_html);
    }

    // Fallback legado: presell publicada antes do SSR, sem HTML gerado.
    if (!hasBuiltAdminFrontend()) {
      return res.status(404).render("presell/404", {
        title: "Presell nao encontrada",
        pixelHtml: ""
      });
    }

    return res.sendFile(frontendDistIndexFile, {
      headers: getAdminFrontendCacheHeaders(frontendDistIndexFile)
    });
  });

  return router;
}

// Serve o CSS compilado do frontend numa rota estável, sem hash, para que o
// HTML estático possa referenciá-lo de forma imutável entre builds.
function createPresellCssHandler() {
  return (req, res) => {
    const assetsDir = path.join(frontendDistDir, "assets");

    let cssFiles = [];
    try {
      cssFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith(".css"));
    } catch {
      // Diretório de assets ausente (frontend não buildado).
    }

    if (cssFiles.length === 0) {
      return res.status(404).end();
    }

    const newest = cssFiles
      .map((file) => ({
        file,
        mtime: fs.statSync(path.join(assetsDir, file)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime)[0].file;

    return res.sendFile(path.join(assetsDir, newest), {
      headers: { "Content-Type": "text/css; charset=utf-8" }
    });
  };
}

module.exports = {
  createAdminFrontendRouter,
  createPublicPresellHandler,
  createPresellCssHandler,
  hasBuiltAdminFrontend
};
