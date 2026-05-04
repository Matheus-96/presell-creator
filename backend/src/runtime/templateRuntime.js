const {
  getTemplateManifest,
  normalizeTemplateSettings,
  parsePresellTemplateSettings,
  buildTemplatePreviewContract
} = require("../templates");
const { generatePixelHtml } = require("../services/pixelService");
const { getTemplateRenderer } = require("./rendererRegistry");
const { buildPreviewBridgeScript } = require("./previewBridge");
const { renderReactTemplate } = require("./react");
const { buildTemplatePresentation } = require("./templatePresentation");

function createPresellDraft(overrides = {}) {
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
    background_image_path: "",
    settings_json: "{}",
    ...overrides
  };
}

function parseRuntimeBullets(presell) {
  return String((presell && presell.bullets) || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function prepareRuntimePresell(presell, options = {}) {
  const { postedSettings = null, existingPresell = null } = options;
  const draftPresell = createPresellDraft(presell);
  const template = getTemplateManifest(draftPresell.template);
  const baseSettings = existingPresell
    ? parsePresellTemplateSettings(existingPresell)
    : parsePresellTemplateSettings(draftPresell);
  const settings = postedSettings
    ? normalizeTemplateSettings(template.id, postedSettings, baseSettings)
    : baseSettings;

  return {
    template,
    settings,
    presell: {
      ...draftPresell,
      template: template.id,
      settings_json: JSON.stringify(settings)
    }
  };
}

function buildTemplateRuntime(presell, options = {}) {
  const { preview = false } = options;
  const { template, settings, presell: runtimePresell } = prepareRuntimePresell(presell, options);
  const renderer = getTemplateRenderer(template.id);
  const previewContract = buildTemplatePreviewContract(template.id);
  const viewModel = {
    title: options.title || runtimePresell.title || runtimePresell.headline || "Presell",
    presell: runtimePresell,
    settings,
    bullets: parseRuntimeBullets(runtimePresell),
    pixelHtml: generatePixelHtml(runtimePresell.google_pixel),
    trackingQuery: options.trackingQuery || "",
    preview,
    previewBridgeScript: preview ? buildPreviewBridgeScript(previewContract) : "",
    template,
    runtime: {
      schemaVersion: 1,
      mode: preview ? "preview" : "public",
      templateId: template.id,
      renderer,
      previewContract
    }
  };

  return {
    ...viewModel,
    templateData: buildTemplatePresentation(viewModel)
  };
}

function renderEjsTemplate(res, viewModel) {
  return res.render(viewModel.runtime.renderer.view, viewModel);
}

function renderEjsTemplateToHtml(app, viewModel) {
  return new Promise((resolve, reject) => {
    app.render(viewModel.runtime.renderer.view, viewModel, (error, html) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ html, viewModel });
    });
  });
}

function renderTemplateRuntime(res, options) {
  const viewModel = buildTemplateRuntime(options.presell, options);

  if (viewModel.runtime.renderer.engine === "react") {
    try {
      return res.type("html").send(renderReactTemplate(viewModel));
    } catch (error) {
      console.error(`React render failed for template "${viewModel.template.id}". Falling back to EJS.`, error);
    }
  }

  return renderEjsTemplate(res, viewModel);
}

function renderTemplateRuntimeToHtml(app, options) {
  const viewModel = buildTemplateRuntime(options.presell, options);

  if (viewModel.runtime.renderer.engine === "react") {
    try {
      return Promise.resolve({
        html: renderReactTemplate(viewModel),
        viewModel
      });
    } catch (error) {
      console.error(`React render failed for template "${viewModel.template.id}". Falling back to EJS.`, error);
    }
  }

  return renderEjsTemplateToHtml(app, viewModel);
}

module.exports = {
  createPresellDraft,
  parseRuntimeBullets,
  prepareRuntimePresell,
  buildTemplateRuntime,
  renderTemplateRuntime,
  renderTemplateRuntimeToHtml
};
