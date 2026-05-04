const {
  authenticateAdminCredentials,
  rotateAdminSession
} = require("../services/adminAuthService");
const {
  allowedTemplates,
  listPresells,
  getPresellById,
  savePresell,
  duplicatePresell,
  deletePresell
} = require("../services/presellService");
const {
  templateDefinitions,
  getTemplateDefinition,
  getTemplatePreviewContracts,
  normalizeSettings,
  parsePresellSettings
} = require("../services/presellTemplates");
const {
  getOverview,
  getPresellStatistics
} = require("../services/analyticsService");
const { buildPreviewDraft } = require("../services/previewService");
const { registerUpload } = require("../services/uploadService");
const {
  renderPresellPage
} = require("./presellViewController");
const { createPresellDraft } = require("../runtime");
const { getAdminPathConfig } = require("../services/adminPathService");

function getLogin(req, res) {
  const { buildLegacyAdminPath } = getAdminPathConfig();
  if (req.session.isAdmin) return res.redirect(buildLegacyAdminPath());

  return res.render("admin/login", {
    title: "Login",
    error: "",
    csrfToken: req.session.csrfToken
  });
}

function postLogin(req, res) {
  const { buildLegacyAdminPath } = getAdminPathConfig();

  if (authenticateAdminCredentials(req.body)) {
    return rotateAdminSession(req, { isAdmin: true }, (error) => {
      if (error) {
        console.error("Failed to establish admin session.", error);
        return res.status(500).render("admin/login", {
          title: "Login",
          error: "Nao foi possivel iniciar a sessao.",
          csrfToken: req.session.csrfToken
        });
      }

      return res.redirect(buildLegacyAdminPath());
    });
  }

  return res.status(401).render("admin/login", {
    title: "Login",
    error: "Usuario ou senha invalidos.",
    csrfToken: req.session.csrfToken
  });
}

function postLogout(req, res) {
  const { buildLegacyAdminPath } = getAdminPathConfig();

  return rotateAdminSession(req, { isAdmin: false }, (error) => {
    if (error) {
      console.error("Failed to clear admin session.", error);
      return res.status(500).send("Erro interno no servidor.");
    }

    return res.redirect(buildLegacyAdminPath("/login"));
  });
}

function getDashboard(req, res) {
  return res.render("admin/dashboard", {
    title: "Painel",
    presells: listPresells(),
    analytics: getOverview(),
    csrfToken: req.session.csrfToken
  });
}

function getNewPresellForm(req, res) {
  try {
    const presell = emptyPresell();
    return renderPresellForm(req, res, {
      title: "Nova presell",
      presell
    });
  } catch (error) {
    console.error("Error in GET /presells/new:", error);
    return res.status(500).send(`Erro interno no servidor: ${error.message}`);
  }
}

function postPresell(req, res) {
  const { buildLegacyAdminPath } = getAdminPathConfig();

  try {
    const { imagePath, backgroundImagePath } = extractUploadPaths(req);
    const presell = savePresell(
      { ...req.body, id: req.params.id },
      imagePath,
      backgroundImagePath
    );

    return res.redirect(buildLegacyAdminPath(`/presells/${presell.id}/edit`));
  } catch (error) {
    const presell = { ...emptyPresell(), ...req.body, id: req.params.id };
    const existingPresell = req.params.id ? getPresellById(req.params.id) : null;

    return renderPresellForm(req, res.status(422), {
      title: req.params.id ? "Editar presell" : "Nova presell",
      presell,
      postedSettings: req.body.settings,
      existingPresell,
      error: error.message
    });
  }
}

function getEditPresellForm(req, res) {
  try {
    const presell = getPresellById(req.params.id);
    if (!presell) return res.status(404).send("Presell nao encontrada.");

    return renderPresellForm(req, res, {
      title: "Editar presell",
      presell
    });
  } catch (error) {
    console.error("Error in GET /presells/:id/edit:", error);
    return res.status(500).send(`Erro interno no servidor: ${error.message}`);
  }
}

function getPresellPreview(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) return res.status(404).send("Presell nao encontrada.");

  return renderPresellPage(res, {
    title: `Preview - ${presell.title}`,
    presell,
    preview: true
  });
}

function getPresellStatisticsPage(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) return res.status(404).send("Presell nao encontrada.");

  const stats = getPresellStatistics(req.params.id);

  return res.render("admin/presell-statistics", {
    title: `Estatísticas - ${presell.title}`,
    presell,
    stats,
    timeSeriesLabels: JSON.stringify(stats.timeSeries.map((item) => item.date)),
    timeSeriesViews: JSON.stringify(stats.timeSeries.map((item) => item.views)),
    timeSeriesClicks: JSON.stringify(stats.timeSeries.map((item) => item.clicks)),
    csrfToken: req.session.csrfToken
  });
}

function postNewPresellPreview(req, res) {
  const previewDraft = buildPreviewDraft({ presell: req.body });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return renderPresellPage(res, {
    title: previewDraft.presell.title
      ? `Preview - ${previewDraft.presell.title}`
      : "Preview - Nova presell",
    presell: previewDraft.presell,
    postedSettings: previewDraft.postedSettings,
    preview: true
  });
}

function postExistingPresellPreview(req, res) {
  let previewDraft;

  try {
    previewDraft = buildPreviewDraft({
      basePresellId: Number(req.params.id),
      presell: req.body
    });
  } catch (error) {
    if (error.code === "presell_not_found") {
      return res.status(404).json({ error: "Presell nao encontrada." });
    }

    console.error("Error in POST /presells/:id/preview:", error);
    return res.status(500).send("Erro interno no servidor.");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return renderPresellPage(res, {
    title: previewDraft.presell.title
      ? `Preview - ${previewDraft.presell.title}`
      : "Preview - Presell",
    presell: previewDraft.presell,
    postedSettings: previewDraft.postedSettings,
    existingPresell: previewDraft.basePresell,
    preview: true
  });
}

function postDeletePresell(req, res) {
  const { buildLegacyAdminPath } = getAdminPathConfig();
  deletePresell(req.params.id);
  return res.redirect(buildLegacyAdminPath());
}

function postDuplicatePresell(req, res) {
  const { buildLegacyAdminPath } = getAdminPathConfig();
  const presell = duplicatePresell(req.params.id);
  if (!presell) return res.status(404).send("Presell nao encontrada.");

  return res.redirect(buildLegacyAdminPath(`/presells/${presell.id}/edit`));
}

function renderPresellForm(
  req,
  res,
  {
    title,
    presell,
    postedSettings = null,
    existingPresell = null,
    error = ""
  }
) {
  return res.render("admin/form", {
    title,
    presell,
    ...getFormTemplateLocals(presell, postedSettings, existingPresell),
    previewHtml: "",
    csrfToken: req.session.csrfToken,
    error
  });
}

function extractUploadPaths(req) {
  return {
    imagePath: resolveUploadPath(req, "image", "remove_image"),
    backgroundImagePath: resolveUploadPath(
      req,
      "background_image",
      "remove_background_image"
    )
  };
}

function resolveUploadPath(req, fileField, removeField) {
  if (req.body[removeField] === "true") {
    return null;
  }

  if (req.files && req.files[fileField]) {
    return registerUpload(req.files[fileField][0]);
  }

  return undefined;
}

function getFormTemplateLocals(presell, postedSettings = null, existingPresell = null) {
  const selectedTemplate = getTemplateDefinition(presell.template);
  const existingSettings = existingPresell
    ? parsePresellSettings(existingPresell)
    : parsePresellSettings(presell);
  const settings = postedSettings
    ? normalizeSettings(selectedTemplate.id, postedSettings, existingSettings)
    : existingSettings;

  return {
    templates: allowedTemplates,
    templateDefinitions,
    selectedTemplate,
    templatePreviewContracts: getTemplatePreviewContracts(),
    settings
  };
}

function emptyPresell() {
  return createPresellDraft();
}

module.exports = {
  getLogin,
  postLogin,
  postLogout,
  getDashboard,
  getNewPresellForm,
  postPresell,
  getEditPresellForm,
  getPresellPreview,
  getPresellStatisticsPage,
  postNewPresellPreview,
  postExistingPresellPreview,
  postDeletePresell,
  postDuplicatePresell
};
