const express = require("express");
const { getPublishedPresell, parseBullets } = require("../services/presellService");
const {
  getTemplateDefinition,
  parsePresellSettings
} = require("../services/presellTemplates");
const { recordEvent, getOrCreateSession } = require("../services/analyticsService");
const { buildAffiliateUrl } = require("../services/urlBuilder");
const { generatePixelHtml } = require("../services/pixelService");

const router = express.Router();

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

  res.render(`presell/${selectedTemplate.id}`, {
    title: presell.title,
    presell,
    settings: parsePresellSettings(presell),
    bullets: parseBullets(presell),
    pixelHtml,
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
  const targetUrl = buildAffiliateUrl(presell.affiliate_url, params);
  recordEvent(req, presell, "redirect", { target_url: targetUrl });

  res.redirect(302, targetUrl);
});

module.exports = router;
