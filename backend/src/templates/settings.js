const { getTemplateManifest } = require("./registry");

function parseSettingsJson(settingsJson) {
  if (!settingsJson) return {};
  if (typeof settingsJson === "object" && !Array.isArray(settingsJson)) {
    return { ...settingsJson };
  }

  try {
    const parsed = JSON.parse(settingsJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function getFieldDefaultValue(field) {
  if (Object.prototype.hasOwnProperty.call(field, "defaultValue")) {
    return field.defaultValue;
  }

  if (field.type === "checkbox") return false;
  if (field.type === "select") return field.options[0] ? field.options[0].value : "";
  if (field.type === "range" && field.min !== undefined) return field.min;
  if (field.type === "range") return 0;
  return "";
}

function normalizeTemplateFieldValue(field, value) {
  const fallbackValue = getFieldDefaultValue(field);

  if (field.type === "checkbox") {
    if (Array.isArray(value)) {
      return value.some((item) => item === true || item === "true" || item === "on");
    }

    return value === true || value === "true" || value === "on" || value === "1";
  }

  if (field.type === "select") {
    const selected = String(value ?? fallbackValue ?? "");
    const options = Array.isArray(field.options) ? field.options : [];

    return options.some((option) => option.value === selected)
      ? selected
      : String(fallbackValue ?? "");
  }

  if (field.type === "range") {
    const numericValue = Number(value ?? fallbackValue);
    if (!Number.isFinite(numericValue)) return fallbackValue;

    const min = Number.isFinite(Number(field.min)) ? Number(field.min) : numericValue;
    const max = Number.isFinite(Number(field.max)) ? Number(field.max) : numericValue;
    return Math.min(Math.max(numericValue, min), max);
  }

  return String(value ?? fallbackValue ?? "").trim();
}

function getTemplateDefaultSettings(templateId) {
  return getTemplateManifest(templateId).fields.reduce(
    (defaults, field) => ({
      ...defaults,
      [field.name]: normalizeTemplateFieldValue(field, field.defaultValue)
    }),
    {}
  );
}

function normalizeTemplateSettings(templateId, inputSettings = {}, existingSettings = {}) {
  const manifest = getTemplateManifest(templateId);
  const existing = parseSettingsJson(existingSettings);
  const posted = parseSettingsJson(inputSettings);
  const settings = {
    ...getTemplateDefaultSettings(manifest.id),
    ...existing,
    ...posted
  };

  manifest.fields.forEach((field) => {
    settings[field.name] = normalizeTemplateFieldValue(field, settings[field.name]);
  });

  return settings;
}

function parsePresellTemplateSettings(presell) {
  if (!presell) return getTemplateDefaultSettings("advertorial");

  return normalizeTemplateSettings(
    presell.template,
    {},
    parseSettingsJson(presell.settings_json)
  );
}

module.exports = {
  parseSettingsJson,
  getTemplateDefaultSettings,
  normalizeTemplateSettings,
  parsePresellTemplateSettings,
  normalizeTemplateFieldValue
};
