const { articleBatchReactRenderers } = require("./articleBatch");
const { appAdFullscreenReactRenderer } = require("./appAdFullscreen");
const { appAdReactRenderer } = require("./appAd");
const { deviceFrameReactRenderer } = require("./deviceFrame");
const { offerModalReactRenderer } = require("./offerModal");
const { officialSimpleReactRenderer } = require("./officialSimple");

const reactRenderers = Object.freeze([
  ...articleBatchReactRenderers,
  appAdReactRenderer,
  appAdFullscreenReactRenderer,
  deviceFrameReactRenderer,
  officialSimpleReactRenderer,
  offerModalReactRenderer
]);

const reactRendererRegistry = Object.freeze(
  reactRenderers.reduce((registry, renderer) => ({
    ...registry,
    [renderer.templateId]: renderer,
    [renderer.entry]: renderer
  }), {})
);

function getReactTemplateRenderer(renderer) {
  const byEntry = renderer && renderer.entry ? reactRendererRegistry[renderer.entry] : null;
  const byTemplateId = renderer && renderer.templateId ? reactRendererRegistry[renderer.templateId] : null;
  const resolvedRenderer = byEntry || byTemplateId;

  if (!resolvedRenderer) {
    throw new Error(`No React renderer is registered for template "${renderer && renderer.templateId}".`);
  }

  return resolvedRenderer;
}

function renderReactTemplate(viewModel) {
  return getReactTemplateRenderer(viewModel.runtime.renderer).render(viewModel);
}

module.exports = {
  reactRendererRegistry,
  getReactTemplateRenderer,
  renderReactTemplate
};
