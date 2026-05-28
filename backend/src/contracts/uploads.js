const { buildMediaUrl, normalizeMediaPath } = require("../services/mediaPathService");

const mediaReferenceSchema = {
  type: ["object", "null"],
  properties: {
    fileName: { type: "string" },
    originalName: { type: ["string", "null"] },
    mimeType: { type: ["string", "null"] },
    size: { type: ["number", "null"] },
    url: { type: "string" }
  }
};

const uploadRequestSchema = {
  type: "object",
  description: "multipart/form-data with a single file field named \"file\""
};

const uploadResponseSchema = {
  type: "object",
  required: ["media"],
  properties: {
    media: mediaReferenceSchema
  }
};

function serializeMediaReference(filename, metadata = {}) {
  const normalizedFileName = normalizeMediaPath(filename);
  if (!normalizedFileName) return null;

  return {
    fileName: normalizedFileName,
    originalName: metadata.originalName || metadata.original_name || null,
    mimeType: metadata.mimeType || metadata.mime_type || null,
    size: Number.isFinite(Number(metadata.size)) ? Number(metadata.size) : null,
    url: buildMediaUrl(normalizedFileName)
  };
}

function serializeUploadResponse(file) {
  const fileName = file && (file.file_name || file.filename || file.fileName);

  return {
    media: serializeMediaReference(fileName, file || {})
  };
}

module.exports = {
  mediaReferenceSchema,
  uploadRequestSchema,
  uploadResponseSchema,
  serializeMediaReference,
  serializeUploadResponse
};
