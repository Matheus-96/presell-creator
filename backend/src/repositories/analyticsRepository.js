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
    referrer, user_agent, ip_hash, country, device_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    SUM(CASE WHEN e.event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects,
    ROUND(AVG(CASE
      WHEN e.event_type = 'time_on_page'
        AND CAST(json_extract(e.params_json, '$.seconds') AS REAL) > 0
        AND CAST(json_extract(e.params_json, '$.seconds') AS REAL) < 3600
      THEN CAST(json_extract(e.params_json, '$.seconds') AS REAL)
    END)) AS avg_time_on_page
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
const getPresellGclidDwellTimeStmt = db.prepare(`
  SELECT
    json_extract(pv.params_json, '$.gclid') AS gclid,
    ROUND(AVG(CAST(json_extract(tp.params_json, '$.seconds') AS REAL))) AS avg_dwell_seconds,
    COUNT(*) AS sessions_with_click
  FROM events tp
  JOIN events pv ON pv.id = (
    SELECT id FROM events
    WHERE session_key = tp.session_key
      AND presell_id = tp.presell_id
      AND event_type = 'page_view'
      AND id < tp.id
    ORDER BY id DESC
    LIMIT 1
  )
  WHERE tp.event_type = 'time_on_page'
    AND tp.presell_id = ?
    AND json_extract(pv.params_json, '$.gclid') IS NOT NULL
    AND CAST(json_extract(tp.params_json, '$.seconds') AS REAL) > 0
    AND CAST(json_extract(tp.params_json, '$.seconds') AS REAL) < 3600
  GROUP BY gclid
  ORDER BY sessions_with_click DESC
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
const getPresellAvgTimeOnPageStmt = db.prepare(`
  SELECT
    AVG(CAST(json_extract(params_json, '$.seconds') AS REAL)) AS avg_seconds,
    COUNT(*) AS sample_count
  FROM events
  WHERE presell_id = ? AND event_type = 'time_on_page'
    AND json_extract(params_json, '$.seconds') IS NOT NULL
    AND CAST(json_extract(params_json, '$.seconds') AS REAL) > 0
    AND CAST(json_extract(params_json, '$.seconds') AS REAL) < 3600
`);
const getPresellDeviceOptionsStmt = db.prepare(`
  SELECT DISTINCT device_type
  FROM events
  WHERE presell_id = ? AND device_type IS NOT NULL
  ORDER BY device_type ASC
`);
const getPresellCountryOptionsStmt = db.prepare(`
  SELECT DISTINCT country
  FROM events
  WHERE presell_id = ? AND country IS NOT NULL
  ORDER BY country ASC
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
    event.ipHash,
    event.country ?? null,
    event.deviceType ?? null
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

const PAGE_SIZE = 50;

function getPresellEventsPaginated(presellId, page = 1, filters = {}) {
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = ["presell_id = ?"];
  const params = [presellId];

  if (filters.hasClickId === true) {
    conditions.push(
      "(NULLIF(json_extract(params_json, '$.gclid'), '') IS NOT NULL OR NULLIF(json_extract(params_json, '$.gbraid'), '') IS NOT NULL OR NULLIF(json_extract(params_json, '$.wbraid'), '') IS NOT NULL)"
    );
  }
  if (filters.from) {
    conditions.push("created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("created_at <= ?");
    params.push(filters.to);
  }
  if (filters.device) {
    conditions.push("device_type = ?");
    params.push(filters.device);
  }
  if (filters.country) {
    conditions.push("country = ?");
    params.push(filters.country);
  }

  const where = conditions.join(" AND ");

  const rows = db.prepare(
    `SELECT * FROM events WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, PAGE_SIZE, offset);

  const { total } = db.prepare(
    `SELECT COUNT(*) AS total FROM events WHERE ${where}`
  ).get(...params);

  return { rows, total: Number(total) };
}

function getPresellEventFilterOptions(presellId) {
  const deviceRows = getPresellDeviceOptionsStmt.all(presellId);
  const countryRows = getPresellCountryOptionsStmt.all(presellId);
  return {
    deviceOptions: deviceRows.map((r) => r.device_type),
    countryOptions: countryRows.map((r) => r.country)
  };
}

function getPresellStatistics(presellId) {
  return {
    summary: getPresellSummaryStmt.get(presellId),
    timeSeries: getPresellTimeSeriesStmt.all(presellId),
    gclidStats: getPresellGclidStatsStmt.all(presellId),
    gclidDwellTime: getPresellGclidDwellTimeStmt.all(presellId),
    utmSources: getPresellUtmSourcesStmt.all(presellId),
    referrers: getPresellReferrersStmt.all(presellId),
    recentEvents: getPresellRecentEventsStmt.all(presellId),
    avgTimeOnPage: getPresellAvgTimeOnPageStmt.get(presellId)
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
  getPresellEventsPaginated,
  getPresellEventFilterOptions,
  getAdminSummary
};
