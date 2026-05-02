const express = require("express");
const { requireAuth, verifyAdminPassword } = require("../middleware/auth");
const { attachCsrf, verifyCsrf } = require("../middleware/csrf");
const {
  allowedTemplates,
  listPresells,
  getPresellById,
  savePresell,
  duplicatePresell,
  deletePresell,
  parseBullets
} = require("../services/presellService");
const {
  templateDefinitions,
  getTemplateDefinition,
  normalizeSettings,
  parsePresellSettings
} = require("../services/presellTemplates");
const { getOverview } = require("../services/analyticsService");
const { upload, uploadMultiple, registerUpload } = require("../services/uploadService");
const { generatePixelHtml } = require("../services/pixelService");

const router = express.Router();

router.use(attachCsrf);

router.get("/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.render("admin/login", { title: "Login", error: "" });
});

router.post("/login", verifyCsrf, (req, res) => {
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedHash = process.env.ADMIN_PASSWORD_HASH || "";

  if (
    req.body.username === expectedUser
    && verifyAdminPassword(req.body.password, expectedHash)
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  res.status(401).render("admin/login", {
    title: "Login",
    error: "Usuario ou senha invalidos."
  });
});

router.post("/logout", verifyCsrf, (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

router.get("/", requireAuth, (req, res) => {
  res.render("admin/dashboard", {
    title: "Painel",
    presells: listPresells(),
    analytics: getOverview()
  });
});

router.get("/presells/new", requireAuth, (req, res) => {
  try {
    const presell = emptyPresell();
    const locals = getFormTemplateLocals(presell);

    res.render("admin/form", {
      title: "Nova presell",
      presell,
      ...locals,
      previewHtml: "",
      csrfToken: req.session.csrfToken,
      error: ""
    });
  } catch (error) {
    console.error("Error in GET /presells/new:", error);
    res.status(500).send(`Erro interno no servidor: ${error.message}`);
  }
});

router.post(
  "/presells",
  requireAuth,
  uploadMultiple,
  verifyCsrf,
  savePresellHandler
);

router.get("/presells/:id/edit", requireAuth, (req, res) => {
  try {
    const presell = getPresellById(req.params.id);
    if (!presell) return res.status(404).send("Presell nao encontrada.");

    const locals = getFormTemplateLocals(presell);

    res.render("admin/form", {
      title: "Editar presell",
      presell,
      ...locals,
      previewHtml: "",
      csrfToken: req.session.csrfToken,
      error: ""
    });
  } catch (error) {
    console.error("Error in GET /presells/:id/edit:", error);
    res.status(500).send(`Erro interno no servidor: ${error.message}`);
  }
});

router.post(
  "/presells/:id",
  requireAuth,
  uploadMultiple,
  verifyCsrf,
  savePresellHandler
);

router.get("/presells/:id/preview", requireAuth, (req, res) => {
  const presell = getPresellById(req.params.id);
  if (!presell) return res.status(404).send("Presell nao encontrada.");

  const selectedTemplate = getTemplateDefinition(presell.template);
  const pixelHtml = generatePixelHtml(presell.google_pixel);

  res.render(`presell/${selectedTemplate.id}`, {
    title: `Preview - ${presell.title}`,
    presell,
    settings: parsePresellSettings(presell),
    bullets: parseBullets(presell),
    pixelHtml,
    trackingQuery: "",
    preview: true
  });
});

router.get("/presells/:id/statistics", requireAuth, (req, res) => {
  const presell = getPresellById(req.params.id);
  if (!presell) return res.status(404).send("Presell nao encontrada.");
  
  const { getPresellStatistics } = require("../services/analyticsService");
  const stats = getPresellStatistics(req.params.id);
  
  // Prepare chart data as JSON strings for EJS
  const timeSeriesLabels = JSON.stringify(stats.timeSeries.map(d => d.date));
  const timeSeriesViews = JSON.stringify(stats.timeSeries.map(d => d.views));
  const timeSeriesClicks = JSON.stringify(stats.timeSeries.map(d => d.clicks));
  
  res.render("admin/presell-statistics", {
    title: `Estatísticas - ${presell.title}`,
    presell,
    stats,
    timeSeriesLabels,
    timeSeriesViews,
    timeSeriesClicks,
    csrfToken: req.session.csrfToken
  });
});

// API endpoint para preview de presell NOVO (sem ID na URL)
router.post("/api/presells/preview", requireAuth, verifyCsrf, (req, res) => {
  // Cria presell vazio e faz merge com dados do form
  const previewPresell = {
    ...emptyPresell(),
    ...req.body
  };

  const selectedTemplate = getTemplateDefinition(previewPresell.template);
  const pixelHtml = generatePixelHtml(previewPresell.google_pixel);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.render(`presell/${selectedTemplate.id}`, {
    title: `Preview - ${previewPresell.title || 'Novo Presell'}`,
    presell: previewPresell,
    settings: parsePresellSettings(previewPresell),
    bullets: parseBullets(previewPresell),
    pixelHtml,
    trackingQuery: "",
    preview: true
  });
});

// API endpoint para preview de presell EXISTENTE (com ID na URL)
router.post("/api/presells/:id/preview", requireAuth, verifyCsrf, (req, res) => {
  const presell = getPresellById(req.params.id);
  if (!presell) return res.status(404).json({ error: "Presell nao encontrada." });

  // Merge existing presell with form data (without saving)
  const previewPresell = {
    ...presell,
    ...req.body
  };

  const selectedTemplate = getTemplateDefinition(previewPresell.template);
  const pixelHtml = generatePixelHtml(previewPresell.google_pixel);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.render(`presell/${selectedTemplate.id}`, {
    title: `Preview - ${previewPresell.title}`,
    presell: previewPresell,
    settings: parsePresellSettings(previewPresell),
    bullets: parseBullets(previewPresell),
    pixelHtml,
    trackingQuery: "",
    preview: true
  });
});

router.post("/presells/:id/delete", requireAuth, verifyCsrf, (req, res) => {
  deletePresell(req.params.id);
  res.redirect("/admin");
});

router.post("/presells/:id/duplicate", requireAuth, verifyCsrf, (req, res) => {
  const presell = duplicatePresell(req.params.id);
  if (!presell) return res.status(404).send("Presell nao encontrada.");
  res.redirect(`/admin/presells/${presell.id}/edit`);
});

function savePresellHandler(req, res) {
  try {
    // Handle image removal
    let imagePath = undefined;
    let backgroundImagePath = undefined;
    
    // Check if user wants to remove main image
    if (req.body.remove_image === 'true') {
      imagePath = null; // Signal to remove
    } else if (req.files && req.files.image) {
      imagePath = registerUpload(req.files.image[0]);
    }
    
    // Check if user wants to remove background image
    if (req.body.remove_background_image === 'true') {
      backgroundImagePath = null; // Signal to remove
    } else if (req.files && req.files.background_image) {
      backgroundImagePath = registerUpload(req.files.background_image[0]);
    }
    const presell = savePresell({ ...req.body, id: req.params.id }, imagePath, backgroundImagePath);
    res.redirect(`/admin/presells/${presell.id}/edit`);
  } catch (error) {
    const presell = { ...emptyPresell(), ...req.body, id: req.params.id };
    const existingPresell = req.params.id ? getPresellById(req.params.id) : null;
    res.status(422).render("admin/form", {
      title: req.params.id ? "Editar presell" : "Nova presell",
      presell,
      ...getFormTemplateLocals(presell, req.body.settings, existingPresell),
      error: error.message
    });
  }
}

function getFormTemplateLocals(presell, postedSettings = null, existingPresell = null) {
  try {
    const selectedTemplate = getTemplateDefinition(presell.template);
    const existingSettings = existingPresell
      ? parsePresellSettings(existingPresell)
      : parsePresellSettings(presell);
    const settings = postedSettings
      ? normalizeSettings(selectedTemplate.id, postedSettings, existingSettings)
      : existingSettings;

    const result = {
      templates: allowedTemplates,
      templateDefinitions,
      selectedTemplate,
      settings
    };

    return result;
  } catch (error) {
    console.error("Error in getFormTemplateLocals:", error);
    throw error;
  }
}

function emptyPresell() {
  return {
    id: "",
    slug: "",
    status: "draft",
    template: "advertorial",
    title: "",
    headline: "",
    subtitle: "",
    body: "",
    bullets: "",
    cta_text: "Continuar",
    affiliate_url: "",
    google_pixel: "",
    image_path: "",
    settings_json: "{}"
  };
}

module.exports = router;
