const trackingParamKeys = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id"
];

const trackingParamsProperties = trackingParamKeys.reduce((properties, key) => ({
  ...properties,
  [key]: { type: "string" }
}), {});

const presellReferenceSchema = {
  type: "object",
  required: ["id", "slug", "title"],
  properties: {
    id: { type: "number" },
    slug: { type: "string" },
    title: { type: "string" }
  }
};

const trackingParamsSchema = {
  type: "object",
  properties: trackingParamsProperties,
  additionalProperties: {
    type: "string"
  }
};

const trackingSessionSchema = {
  type: "object",
  required: ["sessionKey", "trackingParams"],
  properties: {
    sessionKey: { type: "string" },
    trackingParams: trackingParamsSchema
  }
};

const trackingEventRequestSchema = {
  type: "object",
  required: ["eventType"],
  properties: {
    eventType: { type: "string" },
    params: {
      type: "object",
      additionalProperties: true
    }
  }
};

const trackingEventResponseSchema = {
  type: "object",
  required: ["presell", "session", "event"],
  properties: {
    presell: presellReferenceSchema,
    session: trackingSessionSchema,
    event: {
      type: "object",
      required: ["eventType", "params"],
      properties: {
        eventType: { type: "string" },
        params: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  }
};

const redirectResolutionSchema = {
  type: "object",
  required: ["presell", "session", "recordedEvents", "redirect"],
  properties: {
    presell: presellReferenceSchema,
    session: trackingSessionSchema,
    recordedEvents: {
      type: "array",
      items: { type: "string" }
    },
    redirect: {
      type: "object",
      required: ["location", "trackingParams", "preservedKeys", "gclid"],
      properties: {
        location: { type: "string" },
        trackingParams: trackingParamsSchema,
        preservedKeys: {
          type: "array",
          items: { type: "string" }
        },
        gclid: { type: ["string", "null"] }
      }
    }
  }
};

function serializeTrackingEventResponse({
  presell,
  sessionKey,
  sessionParams,
  params,
  eventType
}) {
  return {
    presell: serializePresellReference(presell),
    session: serializeTrackingSession({ sessionKey, trackingParams: sessionParams }),
    event: {
      eventType: String(eventType || ""),
      params: serializeObject(params)
    }
  };
}

function serializeTrackingRedirectResponse({
  presell,
  sessionKey,
  params,
  redirectUrl,
  preservedKeys
}) {
  const trackingParams = serializeTrackingParams(params);

  return {
    presell: serializePresellReference(presell),
    session: serializeTrackingSession({ sessionKey, trackingParams: params }),
    recordedEvents: ["cta_click", "redirect"],
    redirect: {
      location: String(redirectUrl || ""),
      trackingParams,
      preservedKeys: Array.isArray(preservedKeys)
        ? preservedKeys.filter((key) => Object.prototype.hasOwnProperty.call(trackingParams, key))
        : Object.keys(trackingParams),
      gclid: trackingParams.gclid || null
    }
  };
}

function serializeTrackingSession(session = {}) {
  return {
    sessionKey: String(session.sessionKey || ""),
    trackingParams: serializeTrackingParams(session.trackingParams || session.params)
  };
}

function serializeTrackingParams(params = {}) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return {};
  }

  return Object.entries(params).reduce((result, [key, value]) => (
    typeof value === "string" && value.trim() !== ""
      ? { ...result, [key]: value }
      : result
  ), {});
}

function serializePresellReference(presell = {}) {
  return {
    id: Number(presell.id || 0),
    slug: String(presell.slug || ""),
    title: String(presell.title || "")
  };
}

function serializeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}

module.exports = {
  trackingParamsSchema,
  trackingSessionSchema,
  trackingEventRequestSchema,
  trackingEventResponseSchema,
  redirectResolutionSchema,
  serializeTrackingEventResponse,
  serializeTrackingRedirectResponse,
  serializeTrackingSession
};
