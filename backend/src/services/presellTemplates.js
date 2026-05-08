const {
  templateRegistry,
  listTemplateManifests,
  listTemplateIds,
  getTemplateManifest,
  getTemplateDefaultSettings,
  parseSettingsJson,
  normalizeTemplateSettings,
  parsePresellTemplateSettings,
  normalizeTemplateFieldValue,
  buildTemplatePreviewContract,
  getTemplatePreviewContracts
} = require("../templates");
const {
  getTemplateRenderer,
  listTemplateRenderers
} = require("../runtime/rendererRegistry");

const templateDefinitions = listTemplateManifests();
const allowedTemplates = listTemplateIds();

function getTemplateDefinition(templateId) {
  let resolvedTemplateId = templateId;

  if (!resolvedTemplateId || !templateRegistry[resolvedTemplateId]) {
    console.warn(`Template "${templateId}" not found, falling back to "advertorial"`);
    resolvedTemplateId = "advertorial";
  }

  const manifest = getTemplateManifest(resolvedTemplateId);

  if (!manifest.availability.templateFile) {
    console.warn(`Template file "${manifest.renderer.fileName}" not found for "${manifest.id}"`);
  }

  return manifest;
}

function getDefaultSettings(templateId) {
  return getTemplateDefaultSettings(templateId);
}

function normalizeSettings(templateId, inputSettings = {}, existingSettings = {}) {
  return normalizeTemplateSettings(templateId, inputSettings, existingSettings);
}

function parsePresellSettings(presell) {
  return parsePresellTemplateSettings(presell);
}

function getAvailableTemplates() {
  return listTemplateManifests({ availableOnly: true }).map((manifest) => ({
    id: manifest.id,
    name: manifest.name,
    description: manifest.description
  }));
}

module.exports = {
  templateRegistry,
  templateDefinitions,
  allowedTemplates,
  getTemplateDefinition,
  getDefaultSettings,
  parseSettingsJson,
  normalizeSettings,
  parsePresellSettings,
  normalizeFieldValue: normalizeTemplateFieldValue,
  getAvailableTemplates,
  getTemplateRenderer,
  listTemplateRenderers,
  getTemplatePreviewContract: buildTemplatePreviewContract,
  getTemplatePreviewContracts
};
