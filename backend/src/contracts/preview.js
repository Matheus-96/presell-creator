const {
  presellDetailSchema,
  presellPatchSchema,
  serializePresellDetail
} = require("./presells");
const { templateMetadataSchema, serializeTemplateMetadata } = require("./templates");
const { mediaReferenceSchema } = require("./uploads");

const booleanLikeSchema = {
  oneOf: [
    { type: "boolean" },
    { type: "string" }
  ]
};

const previewMediaSchema = {
  type: "object",
  properties: {
    heroImage: {
      oneOf: [
        mediaReferenceSchema,
        { type: "null" }
      ]
    },
    backgroundImage: {
      oneOf: [
        mediaReferenceSchema,
        { type: "null" }
      ]
    }
  }
};

const previewDraftSchema = {
  type: "object",
  properties: {
    ...presellPatchSchema.properties,
    template: { type: "string" },
    cta_text: { type: "string" },
    affiliate_url: { type: "string" },
    google_pixel: { type: ["string", "null"] },
    current_image_path: { type: "string" },
    current_background_image_path: { type: "string" },
    remove_image: booleanLikeSchema,
    remove_background_image: booleanLikeSchema,
    media: previewMediaSchema
  }
};

const previewRuntimeSchema = {
  type: "object",
  required: ["schemaVersion", "mode", "templateId", "renderer", "previewContract"],
  properties: {
    schemaVersion: { type: "number" },
    mode: { type: "string", enum: ["preview", "public"] },
    templateId: { type: "string" },
    renderer: {
      type: "object",
      required: ["templateId", "kind", "engine", "entry", "view", "fileName"],
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
      required: ["schemaVersion", "templateId", "selectors", "fields"],
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
    }
  }
};

const previewRequestSchema = {
  type: "object",
  properties: {
    basePresellId: { type: ["number", "null"] },
    presell: previewDraftSchema
  }
};

const previewResponseSchema = {
  type: "object",
  required: ["html", "contentType", "presell", "template", "runtime"],
  properties: {
    html: { type: "string" },
    contentType: { type: "string", enum: ["text/html"] },
    presell: presellDetailSchema,
    template: templateMetadataSchema,
    runtime: previewRuntimeSchema
  }
};

function serializePreviewDocument({ html, presell, template, runtime }) {
  return {
    html: String(html || ""),
    contentType: "text/html",
    presell: serializePresellDetail(presell),
    template: serializeTemplateMetadata(template),
    runtime
  };
}

module.exports = {
  previewDraftSchema,
  previewRequestSchema,
  previewResponseSchema,
  previewRuntimeSchema,
  serializePreviewDocument
};
