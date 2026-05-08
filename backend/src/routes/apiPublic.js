const express = require("express");
const {
  getContracts,
  recordPresellEvent,
  resolvePresellRedirect
} = require("../controllers/publicApiController");
const {
  publicEventRateLimit,
  publicRedirectRateLimit
} = require("../middleware/publicRateLimit");

const router = express.Router();

router.get("/contracts", getContracts);
router.post("/presells/:slug/events", publicEventRateLimit, recordPresellEvent);
router.post("/presells/:slug/redirect", publicRedirectRateLimit, resolvePresellRedirect);

module.exports = router;
