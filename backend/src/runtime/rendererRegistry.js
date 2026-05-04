const { getTemplateManifest, listTemplateManifests } = require("../templates");

function createRendererDefinition(manifest) {
  const renderer = manifest && manifest.renderer ? manifest.renderer : {};

  return Object.freeze({
    templateId: String(manifest.id),
    kind: String(renderer.kind || "server-view"),
    engine: String(renderer.engine || "ejs"),
    entry: String(renderer.entry || renderer.view || `presell/${manifest.id}`),
    view: String(renderer.view || renderer.entry || `presell/${manifest.id}`),
    fileName: String(renderer.fileName || `${manifest.id}.ejs`)
  });
}

const rendererRegistry = Object.freeze(
  listTemplateManifests().reduce(
    (registry, manifest) => ({
      ...registry,
      [manifest.id]: createRendererDefinition(manifest)
    }),
    {}
  )
);

function getTemplateRenderer(templateId) {
  const manifest = getTemplateManifest(templateId);
  return rendererRegistry[manifest.id] || rendererRegistry.advertorial;
}

function listTemplateRenderers() {
  return Object.values(rendererRegistry);
}

module.exports = {
  rendererRegistry,
  getTemplateRenderer,
  listTemplateRenderers
};
