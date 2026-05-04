const { getAdminSummary: getAnalyticsAdminSummary } = require("../services/analyticsService");

async function getAdminSummary(req, res) {
  try {
    res.json(getAnalyticsAdminSummary());
  } catch (error) {
    console.error("Admin summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
}

module.exports = { getAdminSummary };
