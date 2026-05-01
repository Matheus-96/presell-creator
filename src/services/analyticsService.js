const crypto = require("crypto");
const { db } = require("../db/connection");
const { collectTrackingParams, getClientIp, hashIp } = require("../middleware/tracking");

function getOrCreateSession(req) {
  if (!req.session.trackingKey) {
    req.session.trackingKey = crypto.randomBytes(18).toString("hex");
  }

  const sessionKey = req.session.trackingKey;
  const existingParams = getSessionParams(sessionKey);
  const incomingParams = collectTrackingParams(req.query || {});
  const mergedParams = { ...existingParams, ...incomingParams };

  db.prepare(`
    INSERT INTO tracking_sessions (
      session_key, params_json, referrer, user_agent, ip_hash, updated_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(session_key) DO UPDATE SET
      params_json = excluded.params_json,
      referrer = COALESCE(NULLIF(excluded.referrer, ''), tracking_sessions.referrer),
      user_agent = excluded.user_agent,
      ip_hash = excluded.ip_hash,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    sessionKey,
    JSON.stringify(mergedParams),
    req.get("referer") || "",
    req.get("user-agent") || "",
    hashIp(getClientIp(req))
  );

  return { sessionKey, params: mergedParams };
}

function getSessionParams(sessionKey) {
  const row = db
    .prepare("SELECT params_json FROM tracking_sessions WHERE session_key = ?")
    .get(sessionKey);
  if (!row) return {};

  try {
    return JSON.parse(row.params_json);
  } catch {
    return {};
  }
}

function recordEvent(req, presell, eventType, extraParams = {}) {
  const { sessionKey, params } = getOrCreateSession(req);
  const payload = { ...params, ...extraParams };

  db.prepare(`
    INSERT INTO events (
      presell_id, session_key, event_type, params_json,
      referrer, user_agent, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    presell ? presell.id : null,
    sessionKey,
    eventType,
    JSON.stringify(payload),
    req.get("referer") || "",
    req.get("user-agent") || "",
    hashIp(getClientIp(req))
  );

  return { sessionKey, params: payload };
}

function getOverview() {
  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS views,
      SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS clicks,
      SUM(CASE WHEN event_type = 'redirect' THEN 1 ELSE 0 END) AS redirects
    FROM events
  `).get();

  const byPresell = db.prepare(`
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
  `).all();

  const recent = db.prepare(`
    SELECT e.*, p.title, p.slug
    FROM events e
    LEFT JOIN presells p ON p.id = e.presell_id
    ORDER BY e.created_at DESC
    LIMIT 30
  `).all();

  const sources = db.prepare(`
    SELECT json_extract(params_json, '$.utm_source') AS source, COUNT(*) AS total
    FROM events
    WHERE event_type = 'page_view'
    GROUP BY source
    ORDER BY total DESC
    LIMIT 10
  `).all();

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

module.exports = { getOrCreateSession, recordEvent, getOverview };
