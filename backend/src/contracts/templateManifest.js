const SUPPORTED_TEMPLATE_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "select",
  "checkbox",
  "color",
  "range"
]);

function normalizeTemplateFieldType(type) {
  const normalizedType = String(type || "text").trim().toLowerCase();
  return SUPPORTED_TEMPLATE_FIELD_TYPES.has(normalizedType)
    ? normalizedType
    : "text";
}

function normalizeTemplateFieldOption(option) {
  const rawOption = option && typeof option === "object" && !Array.isArray(option)
    ? option
    : { value: option, label: option };
  const value = rawOption.value === undefined || rawOption.value === null
    ? ""
    : String(rawOption.value);
  const label = rawOption.label === undefined || rawOption.label === null
    ? value
    : String(rawOption.label);

  return { value, label };
}

function normalizeNumericConstraint(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function normalizeRows(value) {
  const rows = Math.floor(Number(value));
  return Number.isFinite(rows) && rows > 0 ? rows : undefined;
}

function getTemplateFieldFallbackDefault(type, options, minimum) {
  if (type === "checkbox") return false;
  if (type === "select") return options[0] ? options[0].value : "";
  if (type === "range" && minimum !== undefined) return minimum;
  if (type === "range") return 0;
  return "";
}

function normalizeTemplateField(field, index = 0) {
  const type = normalizeTemplateFieldType(field && field.type);
  const name = String((field && field.name) || `field_${index + 1}`).trim();
  const options = type === "select" && Array.isArray(field && field.options)
    ? field.options.map(normalizeTemplateFieldOption)
    : [];
  const min = normalizeNumericConstraint(field && field.min);
  const max = normalizeNumericConstraint(field && field.max);
  const step = normalizeNumericConstraint(field && field.step);
  const previewSelector = String((field && field.previewSelector) || "").trim();
  const hasDefaultValue = field && Object.prototype.hasOwnProperty.call(field, "defaultValue");

  return {
    schemaVersion: 1,
    key: name,
    name,
    inputName: `settings[${name}]`,
    label: String((field && field.label) || name),
    description: String((field && field.description) || ""),
    type,
    defaultValue: hasDefaultValue
      ? field.defaultValue
      : getTemplateFieldFallbackDefault(type, options, min),
    helpText: String((field && field.helpText) || ""),
    rows: normalizeRows(field && field.rows),
    min,
    max,
    step,
    options,
    previewSelector,
    preview: previewSelector
      ? {
        selector: previewSelector,
        source: "manifest"
      }
      : null,
    validation: {
      required: Boolean(field && field.required),
      min,
      max,
      step,
      options: options.map((option) => option.value)
    }
  };
}

function normalizeTemplateManifest(definition) {
  const id = String((definition && definition.id) || "").trim();
  const fields = Array.isArray(definition && definition.fields)
    ? definition.fields.map(normalizeTemplateField)
    : [];

  return {
    schemaVersion: 1,
    kind: "template-manifest",
    id,
    name: String((definition && definition.name) || id),
    description: String((definition && definition.description) || ""),
    fields,
    renderer: {
      kind: String((definition && definition.renderer && definition.renderer.kind) || "server-view"),
      engine: String((definition && definition.renderer && definition.renderer.engine) || "ejs"),
      entry: String((definition && definition.renderer && definition.renderer.entry) || `presell/${id}`),
      view: String((definition && definition.renderer && definition.renderer.view) || `presell/${id}`),
      fileName: String((definition && definition.renderer && definition.renderer.fileName) || `${id}.ejs`)
    }
  };
}

module.exports = {
  SUPPORTED_TEMPLATE_FIELD_TYPES,
  normalizeTemplateFieldType,
  normalizeTemplateFieldOption,
  normalizeTemplateField,
  normalizeTemplateManifest
};
