const { getEnv } = require("../config/env");
const {
  adminApiContract,
  buildApiError,
  serializeAdminSession,
  serializePresellDetail,
  serializePresellWriteInput,
  deserializePresellWriteInput,
  deserializePresellListQuery,
  serializePresellListResponse,
  serializeTemplateCatalog,
  serializeAnalyticsOverview,
  serializeAnalyticsSummary,
  serializePresellStatistics,
  serializePresellEventsPage,
  serializeUploadResponse,
  zodPresellWriteSchema,
  zodPresellPatchSchema
} = require("../contracts");
const { templateDefinitions } = require("../services/presellTemplates");
const {
  listPresellCollection,
  getPresellById,
  savePresell,
  duplicatePresell,
  deletePresell
} = require("../services/presellService");
const {
  getOverview,
  getAdminSummary,
  getPresellStatistics,
  getPresellEventsPaginated
} = require("../services/analyticsService");
const {
  authenticateAdminCredentials,
  rotateAdminSession
} = require("../services/adminAuthService");
const { registerUpload } = require("../services/uploadService");
const { processUploadedImage } = require("../services/imageProcessor");
const { notify } = require("../services/telegram.service");
const { extractRequestMeta } = require("../utils/request-meta");

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

    notify('admin.login', extractRequestMeta(req));
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

function getPresellCollection(req, res) {
  const query = deserializePresellListQuery(req.query);

  res.json(serializePresellListResponse(listPresellCollection(query)));
}

function getPresell(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) {
    return respondPresellNotFound(res, req.params.id);
  }

  return res.json(serializePresellDetail(presell));
}

function createPresell(req, res) {
  const validationResult = zodPresellWriteSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json(buildApiError(
      "validation_error",
      "Dados inválidos.",
      { fields: validationResult.error.flatten() }
    ));
  }

  return persistPresellMutation(req, res, {
    payload: req.body,
    statusCode: 201
  });
}

function updatePresell(req, res) {
  // Validate input first (before checking if presell exists)
  const validationResult = zodPresellPatchSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json(buildApiError(
      "validation_error",
      "Dados inválidos.",
      { fields: validationResult.error.flatten() }
    ));
  }

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

function getAnalyticsPresellEvents(req, res) {
  const presell = getPresellById(req.params.id);
  if (!presell) {
    return respondPresellNotFound(res, req.params.id);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filters = {};
  if (req.query.hasClickId === "true") filters.hasClickId = true;
  if (typeof req.query.from === "string" && req.query.from) filters.from = req.query.from;
  if (typeof req.query.to === "string" && req.query.to) filters.to = req.query.to;
  if (typeof req.query.device === "string" && req.query.device) filters.device = req.query.device;
  if (typeof req.query.country === "string" && req.query.country) filters.country = req.query.country;

  const data = getPresellEventsPaginated(req.params.id, page, filters);
  return res.json(serializePresellEventsPage(data));
}

async function postUpload(req, res) {
  if (!req.file) {
    return res.status(400).json(buildApiError(
      "upload_required",
      "Attach a file using the multipart field named \"file\"."
    ));
  }

  const purpose = req.query.purpose;
  const processedFile = await processUploadedImage(req.file, purpose);
  const filename = registerUpload(processedFile);
  return res.status(201).json(serializeUploadResponse({
    ...processedFile,
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
  getPresellCollection,
  getPresell,
  createPresell,
  updatePresell,
  removePresell,
  duplicateExistingPresell,
  getAnalyticsOverview,
  getAnalyticsSummary,
  getAnalyticsPresellStatistics,
  getAnalyticsPresellEvents,
  postUpload
};
