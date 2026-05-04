const {
  buildApiError,
  publicApiContract,
  serializeTrackingEventResponse,
  serializeTrackingRedirectResponse
} = require("../contracts");
const { getPublishedPresell } = require("../services/presellService");
const { recordEvent, resolveRedirect } = require("../services/analyticsService");

function getContracts(req, res) {
  res.json(publicApiContract);
}

function recordPresellEvent(req, res) {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return res.status(404).json(buildApiError(
      "presell_not_found",
      "No published presell matches the requested slug.",
      { slug: req.params.slug }
    ));
  }

  const eventType = normalizeEventType(req.body && req.body.eventType);
  if (!eventType) {
    return res.status(400).json(buildApiError(
      "invalid_event_type",
      "eventType must be a non-empty string with at most 50 characters."
    ));
  }

  return res.status(201).json(serializeTrackingEventResponse({
    presell,
    ...recordEvent(req, presell, eventType, getEventParams(req.body && req.body.params)),
    eventType
  }));
}

function resolvePresellRedirectContract(req, res) {
  const presell = getPublishedPresell(req.params.slug);
  if (!presell) {
    return res.status(404).json(buildApiError(
      "presell_not_found",
      "No published presell matches the requested slug.",
      { slug: req.params.slug }
    ));
  }

  return res.json(serializeTrackingRedirectResponse({
    presell,
    ...resolveRedirect(req, presell, getEventParams(req.body && req.body.params))
  }));
}

function normalizeEventType(value) {
  if (typeof value !== "string") return "";

  const normalized = value.trim();
  if (!normalized || normalized.length > 50) {
    return "";
  }

  return normalized;
}

function getEventParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}

module.exports = {
  getContracts,
  recordPresellEvent,
  resolvePresellRedirect: resolvePresellRedirectContract
};
