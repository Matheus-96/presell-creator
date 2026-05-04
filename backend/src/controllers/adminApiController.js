const { getEnv } = require("../config/env");
const {
  adminApiContract,
  buildApiError,
  serializeAdminSession,
  serializePresellDetail,
  serializePresellWriteInput,
  deserializePresellWriteInput,
  serializePresellListResponse,
  serializePreviewDocument,
  serializeTemplateCatalog,
  serializeAnalyticsOverview,
  serializeAnalyticsSummary,
  serializePresellStatistics,
  serializeUploadResponse
} = require("../contracts");
const { templateDefinitions } = require("../services/presellTemplates");
const {
  listPresells,
  getPresellById,
  savePresell,
  duplicatePresell,
  deletePresell
} = require("../services/presellService");
const {
  getOverview,
  getAdminSummary,
  getPresellStatistics
} = require("../services/analyticsService");
const {
  authenticateAdminCredentials,
  rotateAdminSession
} = require("../services/adminAuthService");
const { buildPreviewDocument } = require("../services/previewService");
const { registerUpload } = require("../services/uploadService");

function getContracts(req, res) {
  res.json(adminApiContract);
}

function respondWithSession(req, res, statusCode = 200) {
  const { adminUser } = getEnv();

  res.set("Cache-Control", "no-store");
  res.status(statusCode).json(serializeAdminSession({
    authenticated: Boolean(req.session && req.session.isAdmin),
    username: adminUser,
    csrfToken: req.session && req.session.csrfToken
  }));
}

function getSession(req, res) {
  respondWithSession(req, res);
}

function postSession(req, res) {
  const username = typeof req.body.username === "string"
    ? req.body.username.trim()
    : "";
  const password = typeof req.body.password === "string"
    ? req.body.password
    : "";

  if (!username || !password) {
    return res.status(400).json(buildApiError(
      "invalid_login_request",
      "Both username and password are required.",
      {
        missing: [
          !username ? "username" : null,
          !password ? "password" : null
        ].filter(Boolean)
      }
    ));
  }

  if (!authenticateAdminCredentials({ username, password })) {
    return res.status(401).json(buildApiError(
      "invalid_credentials",
      "The supplied username or password is incorrect."
    ));
  }

  return rotateAdminSession(req, { isAdmin: true }, (error) => {
    if (error) {
      console.error("Failed to establish admin API session.", error);
      return res.status(500).json(buildApiError(
        "session_create_failed",
        "The admin session could not be created."
      ));
    }

    return respondWithSession(req, res);
  });
}

function deleteSession(req, res) {
  return rotateAdminSession(req, { isAdmin: false }, (error) => {
    if (error) {
      console.error("Failed to reset admin API session.", error);
      return res.status(500).json(buildApiError(
        "session_destroy_failed",
        "The admin session could not be cleared."
      ));
    }

    return respondWithSession(req, res);
  });
}

function getTemplates(req, res) {
  res.json(serializeTemplateCatalog(templateDefinitions));
}

async function postPreview(req, res, next) {
  try {
    const previewDocument = await buildPreviewDocument(req.app, req.body);

    return res.json(serializePreviewDocument(previewDocument));
  } catch (error) {
    if (error.code === "presell_not_found") {
      return respondPresellNotFound(res, error.details && error.details.id);
    }

    return next(error);
  }
}

function getPresellCollection(req, res) {
  res.json(serializePresellListResponse(listPresells(), req.query));
}

function getPresell(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) {
    return respondPresellNotFound(res, req.params.id);
  }

  return res.json(serializePresellDetail(presell));
}

function createPresell(req, res) {
  return persistPresellMutation(req, res, {
    payload: req.body,
    statusCode: 201
  });
}

function updatePresell(req, res) {
  const existingPresell = getPresellById(req.params.id);
  if (!existingPresell) {
    return respondPresellNotFound(res, req.params.id);
  }

  return persistPresellMutation(req, res, {
    payload: mergePresellPayload(existingPresell, req.body),
    statusCode: 200,
    presellId: Number(existingPresell.id)
  });
}

function removePresell(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) {
    return respondPresellNotFound(res, req.params.id);
  }

  deletePresell(req.params.id);
  return res.status(204).end();
}

function duplicateExistingPresell(req, res) {
  const presell = duplicatePresell(req.params.id);
  if (!presell) {
    return respondPresellNotFound(res, req.params.id);
  }

  return res.status(201).json(serializePresellDetail(presell));
}

function getAnalyticsSummary(req, res) {
  res.json(serializeAnalyticsSummary(getAdminSummary()));
}

function getAnalyticsOverview(req, res) {
  res.json(serializeAnalyticsOverview(getOverview()));
}

function getAnalyticsPresellStatistics(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) {
    return respondPresellNotFound(res, req.params.id);
  }

  return res.json(serializePresellStatistics(getPresellStatistics(req.params.id), presell));
}

function postUpload(req, res) {
  if (!req.file) {
    return res.status(400).json(buildApiError(
      "upload_required",
      "Attach a file using the multipart field named \"file\"."
    ));
  }

  const filename = registerUpload(req.file);
  return res.status(201).json(serializeUploadResponse({
    ...req.file,
    filename
  }));
}

function persistPresellMutation(
  req,
  res,
  {
    payload,
    statusCode,
    presellId = undefined
  }
) {
  try {
    const input = deserializePresellWriteInput({ ...payload, id: presellId });
    const presell = savePresell(
      input,
      input.remove_image ? null : undefined,
      input.remove_background_image ? null : undefined
    );

    return res.status(statusCode).json(serializePresellDetail(presell));
  } catch (error) {
    return respondPresellMutationError(res, error, presellId);
  }
}

function mergePresellPayload(existingPresell, patch = {}) {
  const currentPayload = serializePresellWriteInput(existingPresell);
  const mergedMedia = patch.media
    ? {
      ...currentPayload.media,
      ...patch.media
    }
    : currentPayload.media;

  return {
    ...currentPayload,
    ...patch,
    media: mergedMedia
  };
}

function respondPresellNotFound(res, id) {
  return res.status(404).json(buildApiError(
    "presell_not_found",
    "No presell matches the requested id.",
    { id }
  ));
}

function respondPresellMutationError(res, error, id) {
  if (isSlugConflictError(error)) {
    return res.status(409).json(buildApiError(
      "presell_slug_conflict",
      "Another presell already uses this slug.",
      { id: id || null, field: "slug" }
    ));
  }

  if (error && error.message) {
    return res.status(422).json(buildApiError(
      "presell_validation_failed",
      error.message,
      id ? { id } : {}
    ));
  }

  return res.status(500).json(buildApiError(
    "presell_mutation_failed",
    "Unable to save the presell right now.",
    id ? { id } : {}
  ));
}

function isSlugConflictError(error) {
  return Boolean(
    error
    && (
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
      || error.code === "SQLITE_CONSTRAINT"
      || /UNIQUE constraint failed: presells\.slug/i.test(String(error.message || ""))
    )
  );
}

module.exports = {
  getContracts,
  getSession,
  postSession,
  deleteSession,
  getTemplates,
  postPreview,
  getPresellCollection,
  getPresell,
  createPresell,
  updatePresell,
  removePresell,
  duplicateExistingPresell,
  getAnalyticsOverview,
  getAnalyticsSummary,
  getAnalyticsPresellStatistics,
  postUpload
};
