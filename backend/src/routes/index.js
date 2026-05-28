const express = require("express");
const {
  getHealth,
  getScaffoldStatus
} = require("../controllers/healthController");

const router = express.Router();

router.get("/", getScaffoldStatus);
router.get("/health", getHealth);

module.exports = router;
