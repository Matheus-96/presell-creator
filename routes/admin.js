const express = require("express");

const router = express.Router();

const { getAdminSummary } = require("../controllers/summaryController");

router.get("/summary", getAdminSummary);

module.exports = router;
