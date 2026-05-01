// controllers/summaryController.js
const db = require('../models'); // assuming Sequelize models exported

// Controller to get admin summary
async function getAdminSummary(req, res) {
  try {
    // Assuming User, Sale, and SystemHealth models exist
    const [totalUsers, recentSales, systemHealth] = await Promise.all([
      db.User.count(),
      // recent sales last 7 days
      db.Sale.findAll({
        where: {}, // placeholder, add date filter if model has createdAt
        limit: 5,
        order: [['createdAt', 'DESC']],
      }),
      db.SystemHealth.findOne({})
    ]);

    res.json({
      totalUsers,
      recentSales,
      systemHealth,
    });
  } catch (err) {
    console.error('Error fetching admin summary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAdminSummary };
