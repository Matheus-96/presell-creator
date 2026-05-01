const { db } = require('../src/db/connection');

async function getAdminSummary(req, res) {
  try {
    // Get total users (distinct sessions)
    const totalUsersResult = db.prepare(
      `SELECT COUNT(DISTINCT session_key) as count FROM tracking_sessions`
    ).get();
    const totalUsers = totalUsersResult.count;

    // Get recent sales (redirects in last 30 days)
    const recentSalesResult = db.prepare(
      `SELECT COUNT(*) as count FROM events 
       WHERE event_type = 'redirect' 
       AND created_at >= datetime('now', '-30 days')`
    ).get();
    const recentSales = recentSalesResult.count;

    // System health - check if DB is responsive
    const healthResult = db.prepare('SELECT 1 as ok').get();
    const systemHealth = healthResult.ok ? 'healthy' : 'degraded';

    res.json({ totalUsers, recentSales, systemHealth });
  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}

module.exports = { getAdminSummary };