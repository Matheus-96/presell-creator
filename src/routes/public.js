const express = require("express");
const { getPublishedPresell, parseBullets } = require("../services/presellService");
const {
  getTemplateDefinition,
  parsePresellSettings
} = require("../services/presellTemplates");
const { recordEvent, getOrCreateSession } = require("../services/analyticsService");
const { buildAffiliateUrl, buildRedirectUrl } = require("../services/urlBuilder");
const { generatePixelHtml } = require("../services/pixelService");
const { TRACKING_PARAMS, collectTrackingParams } = require("../middleware/tracking");

const router = express.Router();

// Build a query string from captured tracking params (gclid, utm_*, etc.)
function buildTrackingQuery(query) {
  const params = collectTrackingParams(query);
  const qs = new URLSearchParams(params).toString();
  return qs ? "?" + qs : "";
}

router.get("/", (req, res) => {
  res.redirect("/admin");
});

router.get("/p/:slug", (req, res) => {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return res.status(404).render("presell/404", { 
      title: "Presell nao encontrada",
      pixelHtml: ""
    });
  }

  recordEvent(req, presell, "page_view");
  const selectedTemplate = getTemplateDefinition(presell.template);
  const pixelHtml = generatePixelHtml(presell.google_pixel);
  const trackingQuery = buildTrackingQuery(req.query);

  res.render(`presell/${selectedTemplate.id}`, {
    title: presell.title,
    presell,
    settings: parsePresellSettings(presell),
    bullets: parseBullets(presell),
    pixelHtml,
    trackingQuery,
    preview: false
  });
});

router.get("/go/:slug", (req, res) => {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return res.status(404).render("presell/404", { 
      title: "Presell nao encontrada",
      pixelHtml: ""
    });
  }

  recordEvent(req, presell, "cta_click");
  const { params } = getOrCreateSession(req);
  
  // Extract gclid specifically and strip it from general params to avoid duplication
  const gclid = params.gclid;
  const trackingParams = { ...params };
  delete trackingParams.gclid;
  
  const targetUrl = buildRedirectUrl(presell.affiliate_url, trackingParams, gclid);
  recordEvent(req, presell, "redirect", { target_url: targetUrl });

  res.redirect(302, targetUrl);
});

module.exports = router;
