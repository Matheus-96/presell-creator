const crypto = require("crypto");
const { collectTrackingParams, getClientIp, hashIp } = require("../middleware/tracking");
const analyticsRepository = require("../repositories/analyticsRepository");
const { buildRedirectUrl } = require("./urlBuilder");

function getOrCreateSession(req) {
  if (!req.session.trackingKey) {
    req.session.trackingKey = crypto.randomBytes(18).toString("hex");
  }

  const sessionKey = req.session.trackingKey;
  const existingParams = getSessionParams(sessionKey);
  const incomingParams = collectTrackingParams(req.query || {});
  const mergedParams = { ...existingParams, ...incomingParams };

  analyticsRepository.upsertTrackingSession({
    sessionKey,
    paramsJson: JSON.stringify(mergedParams),
    referrer: req.get("referer") || "",
    userAgent: req.get("user-agent") || "",
    ipHash: hashIp(getClientIp(req))
  });

  return { sessionKey, params: mergedParams };
}

function getSessionParams(sessionKey) {
  const row = analyticsRepository.getTrackingSessionParams(sessionKey);
  if (!row) return {};

  try {
    return JSON.parse(row.params_json);
  } catch {
    return {};
  }
}

function recordEvent(req, presell, eventType, extraParams = {}) {
  return recordEventWithSession(req, presell, eventType, getOrCreateSession(req), extraParams);
}

function recordEventWithSession(req, presell, eventType, session, extraParams = {}) {
  const payload = { ...session.params, ...extraParams };

  analyticsRepository.createEvent({
    presellId: presell ? presell.id : null,
    sessionKey: session.sessionKey,
    eventType,
    paramsJson: JSON.stringify(payload),
    referrer: req.get("referer") || "",
    userAgent: req.get("user-agent") || "",
    ipHash: hashIp(getClientIp(req))
  });

  return {
    sessionKey: session.sessionKey,
    sessionParams: { ...session.params },
    params: payload
  };
}

function resolveRedirect(req, presell, extraParams = {}) {
  const session = getOrCreateSession(req);

  recordEventWithSession(req, presell, "cta_click", session, extraParams);

  const { gclid } = session.params;
  const trackingParams = { ...session.params };
  delete trackingParams.gclid;

  const redirectUrl = buildRedirectUrl(presell.affiliate_url, trackingParams, gclid);

  recordEventWithSession(req, presell, "redirect", session, {
    ...extraParams,
    target_url: redirectUrl
  });

  return {
    sessionKey: session.sessionKey,
    params: { ...session.params },
    redirectUrl,
    preservedKeys: Object.keys({
      ...trackingParams,
      ...(gclid ? { gclid } : {})
    })
  };
}

function getOverview() {
  const {
    totals,
    byPresell,
    recent,
    sources
  } = analyticsRepository.getOverview();

  return {
    totals: normalizeTotals(totals),
    byPresell: byPresell.map(addCtr),
    recent,
    sources
  };
}

function normalizeTotals(totals) {
  const views = Number(totals.views || 0);
  const clicks = Number(totals.clicks || 0);
  const redirects = Number(totals.redirects || 0);
  return { views, clicks, redirects, ctr: views > 0 ? (clicks / views) * 100 : 0 };
}

function addCtr(row) {
  const views = Number(row.views || 0);
  const clicks = Number(row.clicks || 0);
  return { ...row, views, clicks, redirects: Number(row.redirects || 0), ctr: views > 0 ? (clicks / views) * 100 : 0 };
}

function getPresellStatistics(presellId) {
  const {
    summary,
    timeSeries,
    gclidStats,
    utmSources,
    referrers,
    recentEvents
  } = analyticsRepository.getPresellStatistics(presellId);

  return {
    summary: normalizeTotals(summary),
    timeSeries,
    gclidStats: gclidStats.filter(item => item.gclid),
    utmSources: utmSources.filter(item => item.source),
    referrers: referrers.filter(item => item.referrer),
    recentEvents
  };
}

function getAdminSummary() {
  return analyticsRepository.getAdminSummary();
}

module.exports = {
  getOrCreateSession,
  recordEvent,
  recordEventWithSession,
  resolveRedirect,
  getOverview,
  getPresellStatistics,
  getAdminSummary
};
