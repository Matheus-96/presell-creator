const { getPublishedPresell } = require("../services/presellService");
const { resolveRedirect } = require("../services/analyticsService");
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

module.exports = {
  redirectToAdmin,
  redirectPublishedPresell
};
