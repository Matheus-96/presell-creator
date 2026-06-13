const { getPublishedPresell } = require("../services/presellService");
const { resolveRedirect } = require("../services/analyticsService");
const { getPresellV2BySlug } = require("../repositories/presellV2Repository");
const { getEnv } = require("../config/env");

function redirectToAdmin(req, res) {
  res.redirect(getEnv().adminFrontendPath);
}

function redirectPublishedPresell(req, res) {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return res.status(404).render("presell/404", {
      title: "Presell nao encontrada",
      pixelHtml: ""
    });
  }

  const { redirectUrl } = resolveRedirect(req, presell);
  return res.redirect(302, redirectUrl);
}

function getPublicPresellV2(req, res) {
  const row = getPresellV2BySlug(req.params.slug);
  if (!row) {
    return res.status(404).render("presell/404", {
      title: "Presell nao encontrada",
      pixelHtml: ""
    });
  }

  res.set("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(row.rendered_html || "");
}

module.exports = {
  redirectToAdmin,
  redirectPublishedPresell,
  getPublicPresellV2
};
