const { db } = require("../db/connection");

const getTrackingSessionParamsStmt = db.prepare(
  "SELECT params_json FROM tracking_sessions WHERE session_key = ?"
);
const upsertTrackingSessionStmt = db.prepare(`
  INSERT INTO tracking_sessions (
    session_key, params_json, referrer, user_agent, ip_hash, updated_at
  ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(session_key) DO UPDATE SET
    params_json = excluded.params_json,
    referrer = COALESCE(NULLIF(excluded.referrer, ''), tracking_sessions.referrer),
    user_agent = excluded.user_agent,
    ip_hash = excluded.ip_hash,
    updated_at = CURRENT_TIMESTAMP
`);
const createEventStmt = db.prepare(`
  INSERT INTO events (
    presell_id, session_key, event_type, params_json,
    referrer, user_agent, ip_hash
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const getOverviewTotalsStmt = db.prepare(`
  SELECT
    SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
    SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects
  FROM events
`);
const getOverviewByPresellStmt = db.prepare(`
  SELECT
    p.id,
    p.title,
    p.slug,
    SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
    SUM(CASE WHEN e.event_type = 'cta_click' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN e.event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects
  FROM presells p
  LEFT JOIN events e ON e.presell_id = p.id
  GROUP BY p.id
  ORDER BY views DESC, clicks DESC
`);
const getOverviewRecentStmt = db.prepare(`
  SELECT e.*, p.title, p.slug
  FROM events e
  LEFT JOIN presells p ON p.id = e.presell_id
  ORDER BY e.created_at DESC
  LIMIT 30
`);
const getOverviewSourcesStmt = db.prepare(`
  SELECT json_extract(params_json, '$.utm_source') AS source, COUNT(*) AS total
  FROM events
  WHERE event_type = 'page_view'
  GROUP BY source
  ORDER BY total DESC
  LIMIT 10
`);
const getPresellSummaryStmt = db.prepare(`
  SELECT
    SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
    SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects
  FROM events
  WHERE presell_id = ?
`);
const getPresellTimeSeriesStmt = db.prepare(`
  SELECT
    DATE(created_at) AS date,
    SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
    SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects
  FROM events
  WHERE presell_id = ? AND created_at >= datetime('now', '-30 days')
  GROUP BY DATE(created_at)
  ORDER BY date ASC
`);
const getPresellGclidStatsStmt = db.prepare(`
  SELECT
    json_extract(params_json, '$.gclid') AS gclid,
    COUNT(*) AS total_events,
    SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
    SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects
  FROM events
  WHERE presell_id = ? AND json_extract(params_json, '$.gclid') IS NOT NULL
  GROUP BY gclid
  ORDER BY total_events DESC
  LIMIT 100
`);
const getPresellUtmSourcesStmt = db.prepare(`
  SELECT
    json_extract(params_json, '$.utm_source') AS source,
    COUNT(*) AS total
  FROM events
  WHERE presell_id = ? AND event_type = 'page_view' AND json_extract(params_json, '$.utm_source') IS NOT NULL
  GROUP BY source
  ORDER BY total DESC
  LIMIT 20
`);
const getPresellReferrersStmt = db.prepare(`
  SELECT
    referrer,
    COUNT(*) AS total
  FROM events
  WHERE presell_id = ? AND referrer != ''
  GROUP BY referrer
  ORDER BY total DESC
  LIMIT 20
`);
const getPresellRecentEventsStmt = db.prepare(`
  SELECT *
  FROM events
  WHERE presell_id = ?
  ORDER BY created_at DESC
  LIMIT 50
`);
const countDistinctTrackingSessionsStmt = db.prepare(
  "SELECT COUNT(DISTINCT session_key) AS count FROM tracking_sessions"
);
const countRecentRedirectsStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM events
  WHERE event_type = 'redirect'
    AND created_at >= datetime('now', '-30 days')
`);
const healthCheckStmt = db.prepare("SELECT 1 AS ok");

function getTrackingSessionParams(sessionKey) {
  return getTrackingSessionParamsStmt.get(sessionKey);
}

function upsertTrackingSession(session) {
  upsertTrackingSessionStmt.run(
    session.sessionKey,
    session.paramsJson,
    session.referrer,
    session.userAgent,
    session.ipHash
  );
}

function createEvent(event) {
  createEventStmt.run(
    event.presellId,
    event.sessionKey,
    event.eventType,
    event.paramsJson,
    event.referrer,
    event.userAgent,
    event.ipHash
  );
}

function getOverview() {
  return {
    totals: getOverviewTotalsStmt.get(),
    byPresell: getOverviewByPresellStmt.all(),
    recent: getOverviewRecentStmt.all(),
    sources: getOverviewSourcesStmt.all()
  };
}

function getPresellStatistics(presellId) {
  return {
    summary: getPresellSummaryStmt.get(presellId),
    timeSeries: getPresellTimeSeriesStmt.all(presellId),
    gclidStats: getPresellGclidStatsStmt.all(presellId),
    utmSources: getPresellUtmSourcesStmt.all(presellId),
    referrers: getPresellReferrersStmt.all(presellId),
    recentEvents: getPresellRecentEventsStmt.all(presellId)
  };
}

function getAdminSummary() {
  const totalUsersResult = countDistinctTrackingSessionsStmt.get();
  const recentSalesResult = countRecentRedirectsStmt.get();
  const healthResult = healthCheckStmt.get();

  return {
    totalUsers: Number(totalUsersResult.count || 0),
    recentSales: Number(recentSalesResult.count || 0),
    systemHealth: healthResult.ok ? "healthy" : "degraded"
  };
}

module.exports = {
  getTrackingSessionParams,
  upsertTrackingSession,
  createEvent,
  getOverview,
  getPresellStatistics,
  getAdminSummary
};
