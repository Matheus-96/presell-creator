const {
  templateRegistry,
  listTemplateManifests,
  listTemplateIds,
  getTemplateManifest,
  getTemplateDefaultSettings,
  parseSettingsJson,
  normalizeTemplateSettings,
  parsePresellTemplateSettings,
  normalizeTemplateFieldValue
} = require("../templates");

const templateDefinitions = listTemplateManifests();
const allowedTemplates = listTemplateIds();

function getTemplateDefinition(templateId) {
  const firstTemplateId = Object.keys(templateRegistry)[0];
  const resolvedTemplateId = templateId && templateRegistry[templateId]
    ? templateId
    : firstTemplateId;

  if (!templateRegistry[templateId]) {
    console.warn(`Template "${templateId}" not found, falling back to "${firstTemplateId}"`);
  }

  return getTemplateManifest(resolvedTemplateId);
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
  return listTemplateManifests().map((manifest) => ({
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
  getAvailableTemplates
};
