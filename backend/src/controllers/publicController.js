const { getPublishedPresell } = require("../services/presellService");
const {
  getOrCreateSession,
  recordEventWithSession,
  resolveRedirect
} = require("../services/analyticsService");
const {
  renderPresellPage,
  renderPresellNotFound
} = require("./presellViewController");
const { getAdminPathConfig } = require("../services/adminPathService");

function redirectToAdmin(req, res) {
  const { adminEntryPath } = getAdminPathConfig();
  res.redirect(adminEntryPath);
}

function getPublishedPresellPage(req, res) {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return renderPresellNotFound(res);
  }

  const session = getOrCreateSession(req);
  recordEventWithSession(req, presell, "page_view", session);

  return renderPresellPage(res, {
    title: presell.title,
    presell,
    trackingQuery: buildTrackingQuery(session.params)
  });
}

function redirectPublishedPresell(req, res) {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return renderPresellNotFound(res);
  }

  const { redirectUrl } = resolveRedirect(req, presell);
  return res.redirect(302, redirectUrl);
}

function buildTrackingQuery(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : "";
}

module.exports = {
  redirectToAdmin,
  getPublishedPresellPage,
  redirectPublishedPresell
};
