const { buildTemplatePreviewContract } = require("../templates");
const { getTemplateRenderer } = require("../runtime/rendererRegistry");
const { templateDefinitions } = require("../services/presellTemplates");

const templateFieldSchema = {
  type: "object",
  required: ["name", "label", "type"],
  properties: {
    name: { type: "string" },
    label: { type: "string" },
    type: { type: "string" },
    defaultValue: {},
    helpText: { type: ["string", "null"] },
    min: { type: ["number", "null"] },
    max: { type: ["number", "null"] },
    step: { type: ["number", "null"] },
    previewSelector: { type: ["string", "null"] },
    options: {
      type: "array",
      items: {
        type: "object",
        required: ["value", "label"],
        properties: {
          value: { type: "string" },
          label: { type: "string" }
        }
      }
    }
  }
};

const templateMetadataSchema = {
  type: "object",
  required: ["id", "name", "description", "fields"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    renderer: {
      type: "object",
      properties: {
        templateId: { type: "string" },
        kind: { type: "string" },
        engine: { type: "string" },
        entry: { type: "string" },
        view: { type: "string" },
        fileName: { type: "string" }
      }
    },
    previewContract: {
      type: "object",
      properties: {
        schemaVersion: { type: "number" },
        templateId: { type: "string" },
        selectors: {
          type: "object",
          additionalProperties: { type: "string" }
        },
        fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              inputName: { type: "string" },
              selector: { type: "string" },
              source: { type: "string" }
            }
          }
        }
      }
    },
    fields: {
      type: "array",
      items: templateFieldSchema
    }
  }
};

const templateCatalogSchema = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: templateMetadataSchema
    }
  }
};

function serializeTemplateField(field) {
  return {
    name: String(field.name),
    label: String(field.label),
    type: String(field.type),
    defaultValue: field.defaultValue,
    helpText: field.helpText || null,
    min: Number.isFinite(Number(field.min)) ? Number(field.min) : null,
    max: Number.isFinite(Number(field.max)) ? Number(field.max) : null,
    step: Number.isFinite(Number(field.step)) ? Number(field.step) : null,
    previewSelector: field.previewSelector || null,
    options: Array.isArray(field.options)
      ? field.options.map((option) => ({
        value: String(option.value),
        label: String(option.label)
      }))
      : []
  };
}

function serializeTemplateMetadata(template) {
  return {
    id: String(template.id),
    name: String(template.name),
    description: String(template.description || ""),
    renderer: getTemplateRenderer(template.id),
    previewContract: buildTemplatePreviewContract(template.id),
    fields: Array.isArray(template.fields)
      ? template.fields.map(serializeTemplateField)
      : []
  };
}

function serializeTemplateCatalog(templates = templateDefinitions) {
  return {
    items: templates.map(serializeTemplateMetadata)
  };
}

module.exports = {
  templateFieldSchema,
  templateMetadataSchema,
  templateCatalogSchema,
  serializeTemplateField,
  serializeTemplateMetadata,
  serializeTemplateCatalog
};
