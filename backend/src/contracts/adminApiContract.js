const { analyticsOverviewSchema, analyticsSummarySchema, presellStatisticsSchema } = require("./analytics");
const { loginRequestSchema, sessionSchema } = require("./authSession");
const {
  presellDetailSchema,
  presellListResponseSchema,
  presellWriteSchema,
  presellPatchSchema
} = require("./presells");
const { previewRequestSchema, previewResponseSchema } = require("./preview");
const { apiErrorSchema, ADMIN_API_VERSION, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } = require("./shared");
const { templateCatalogSchema, templateMetadataSchema } = require("./templates");
const { uploadRequestSchema, uploadResponseSchema } = require("./uploads");

const adminApiContract = {
  name: "presell-admin-api",
  version: ADMIN_API_VERSION,
  basePath: "/api/admin",
  auth: {
    strategy: "session-cookie",
    csrf: {
      header: "x-csrf-token",
      body: ["_csrf", "csrfToken"]
    }
  },
  versioning: {
    strategy: "additive-unversioned",
    breakingChangePlan: "Introduce /api/v2/admin when a breaking change is unavoidable."
  },
  pagination: {
    type: "cursor",
    defaultLimit: DEFAULT_PAGE_LIMIT,
    maxLimit: MAX_PAGE_LIMIT,
    cursorEncoding: "base64url-json"
  },
  errorSchema: apiErrorSchema,
  schemas: {
    loginRequest: loginRequestSchema,
    session: sessionSchema,
    presellWrite: presellWriteSchema,
    presellPatch: presellPatchSchema,
    presellList: presellListResponseSchema,
    presellDetail: presellDetailSchema,
    templateCatalog: templateCatalogSchema,
    templateMetadata: templateMetadataSchema,
    previewRequest: previewRequestSchema,
    previewResponse: previewResponseSchema,
    analyticsSummary: analyticsSummarySchema,
    analyticsOverview: analyticsOverviewSchema,
    presellStatistics: presellStatisticsSchema,
    uploadRequest: uploadRequestSchema,
    uploadResponse: uploadResponseSchema
  },
  endpoints: [
    {
      operationId: "getAdminSession",
      method: "GET",
      path: "/session",
      auth: "optional",
      note: "Bootstraps the session cookie and CSRF token for the React admin client.",
      response: "session"
    },
    {
      operationId: "createAdminSession",
      method: "POST",
      path: "/session",
      auth: "optional",
      csrf: "required",
      request: "loginRequest",
      response: "session"
    },
    {
      operationId: "destroyAdminSession",
      method: "DELETE",
      path: "/session",
      auth: "optional",
      csrf: "required",
      response: "session"
    },
    {
      operationId: "getAdminContracts",
      method: "GET",
      path: "/contracts",
      auth: "optional",
      response: "self"
    },
    {
      operationId: "listPresells",
      method: "GET",
      path: "/presells",
      auth: "required",
      query: {
        cursor: "opaque cursor",
        limit: `integer <= ${MAX_PAGE_LIMIT}`,
        status: "draft|published",
        templateId: "template id"
      },
      response: "presellList"
    },
    {
      operationId: "getPresell",
      method: "GET",
      path: "/presells/:id",
      auth: "required",
      response: "presellDetail"
    },
    {
      operationId: "createPresell",
      method: "POST",
      path: "/presells",
      auth: "required",
      csrf: "required",
      request: "presellWrite",
      response: "presellDetail"
    },
    {
      operationId: "updatePresell",
      method: "PATCH",
      path: "/presells/:id",
      auth: "required",
      csrf: "required",
      request: "presellPatch",
      response: "presellDetail"
    },
    {
      operationId: "deletePresell",
      method: "DELETE",
      path: "/presells/:id",
      auth: "required",
      csrf: "required",
      response: "204-no-content"
    },
    {
      operationId: "duplicatePresell",
      method: "POST",
      path: "/presells/:id/duplicate",
      auth: "required",
      csrf: "required",
      response: "presellDetail"
    },
    {
      operationId: "listTemplates",
      method: "GET",
      path: "/templates",
      auth: "required",
      response: "templateCatalog"
    },
    {
      operationId: "renderPreview",
      method: "POST",
      path: "/previews",
      auth: "required",
      csrf: "required",
      note: "Renders HTML for unsaved drafts. When basePresellId is present, omitted fields fall back to the saved presell.",
      request: "previewRequest",
      response: "previewResponse"
    },
    {
      operationId: "getAnalyticsOverview",
      method: "GET",
      path: "/analytics",
      auth: "required",
      response: "analyticsOverview"
    },
    {
      operationId: "getAnalyticsSummary",
      method: "GET",
      path: "/analytics/summary",
      auth: "required",
      response: "analyticsSummary"
    },
    {
      operationId: "getPresellStatistics",
      method: "GET",
      path: "/analytics/presells/:id",
      auth: "required",
      response: "presellStatistics"
    },
    {
      operationId: "uploadMedia",
      method: "POST",
      path: "/uploads",
      auth: "required",
      request: "uploadRequest",
      response: "uploadResponse"
    }
  ]
};

module.exports = {
  adminApiContract
};
