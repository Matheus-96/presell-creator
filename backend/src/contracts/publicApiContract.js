const {
  redirectResolutionSchema,
  trackingEventRequestSchema,
  trackingEventResponseSchema
} = require("./tracking");
const { ADMIN_API_VERSION, apiErrorSchema } = require("./shared");

const publicApiContract = {
  name: "presell-public-api",
  version: ADMIN_API_VERSION,
  basePath: "/api/public",
  auth: {
    strategy: "anonymous-session-cookie"
  },
  versioning: {
    strategy: "additive-unversioned",
    breakingChangePlan: "Introduce /api/v2/public when a breaking change is unavoidable."
  },
  errorSchema: apiErrorSchema,
  schemas: {
    trackingEventRequest: trackingEventRequestSchema,
    trackingEventResponse: trackingEventResponseSchema,
    redirectResolution: redirectResolutionSchema
  },
  endpoints: [
    {
      operationId: "getPublicContracts",
      method: "GET",
      path: "/contracts",
      auth: "optional",
      response: "self"
    },
    {
      operationId: "recordPresellEvent",
      method: "POST",
      path: "/presells/:slug/events",
      auth: "optional",
      request: "trackingEventRequest",
      response: "trackingEventResponse"
    },
    {
      operationId: "resolvePresellRedirect",
      method: "POST",
      path: "/presells/:slug/redirect",
      auth: "optional",
      response: "redirectResolution"
    }
  ]
};

module.exports = {
  publicApiContract
};
