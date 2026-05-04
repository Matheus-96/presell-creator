const { adminApiContract } = require("./adminApiContract");
const { publicApiContract } = require("./publicApiContract");
const {
  analyticsSummarySchema,
  analyticsOverviewSchema,
  presellStatisticsSchema,
  serializeAnalyticsSummary,
  serializeAnalyticsOverview,
  serializePresellStatistics
} = require("./analytics");
const { loginRequestSchema, sessionSchema, serializeAdminSession } = require("./authSession");
const {
  presellStatusValues,
  presellWriteSchema,
  presellPatchSchema,
  presellSummarySchema,
  presellDetailSchema,
  presellListResponseSchema,
  serializePresellSummary,
  serializePresellDetail,
  serializePresellWriteInput,
  deserializePresellWriteInput,
  serializePresellListResponse
} = require("./presells");
const {
  previewRequestSchema,
  previewResponseSchema,
  previewRuntimeSchema,
  serializePreviewDocument
} = require("./preview");
const {
  trackingParamsSchema,
  trackingSessionSchema,
  trackingEventRequestSchema,
  trackingEventResponseSchema,
  redirectResolutionSchema,
  serializeTrackingEventResponse,
  serializeTrackingRedirectResponse,
  serializeTrackingSession
} = require("./tracking");
const {
  ADMIN_API_VERSION,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  apiErrorSchema,
  buildApiError,
  getPageLimit,
  encodeCursor,
  decodeCursor,
  createPageInfo,
  toInteger
} = require("./shared");
const {
  templateFieldSchema,
  templateMetadataSchema,
  templateCatalogSchema,
  serializeTemplateField,
  serializeTemplateMetadata,
  serializeTemplateCatalog
} = require("./templates");
const {
  mediaReferenceSchema,
  uploadRequestSchema,
  uploadResponseSchema,
  serializeMediaReference,
  serializeUploadResponse
} = require("./uploads");

module.exports = {
  adminApiContract,
  publicApiContract,
  analyticsSummarySchema,
  analyticsOverviewSchema,
  presellStatisticsSchema,
  serializeAnalyticsSummary,
  serializeAnalyticsOverview,
  serializePresellStatistics,
  loginRequestSchema,
  sessionSchema,
  serializeAdminSession,
  presellStatusValues,
  presellWriteSchema,
  presellPatchSchema,
  presellSummarySchema,
  presellDetailSchema,
  presellListResponseSchema,
  serializePresellSummary,
  serializePresellDetail,
  serializePresellWriteInput,
  deserializePresellWriteInput,
  serializePresellListResponse,
  previewRequestSchema,
  previewResponseSchema,
  previewRuntimeSchema,
  serializePreviewDocument,
  trackingParamsSchema,
  trackingSessionSchema,
  trackingEventRequestSchema,
  trackingEventResponseSchema,
  redirectResolutionSchema,
  serializeTrackingEventResponse,
  serializeTrackingRedirectResponse,
  serializeTrackingSession,
  ADMIN_API_VERSION,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  apiErrorSchema,
  buildApiError,
  getPageLimit,
  encodeCursor,
  decodeCursor,
  createPageInfo,
  toInteger,
  templateFieldSchema,
  templateMetadataSchema,
  templateCatalogSchema,
  serializeTemplateField,
  serializeTemplateMetadata,
  serializeTemplateCatalog,
  mediaReferenceSchema,
  uploadRequestSchema,
  uploadResponseSchema,
  serializeMediaReference,
  serializeUploadResponse
};
