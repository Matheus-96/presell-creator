// routes/admin.js
const express = require('express');
const router = express.Router();

// Import the summary controller
const { getAdminSummary } = require('../controllers/summaryController');

// GET /api/admin/summary
router.get('/summary', getAdminSummary);

module.exports = router;
