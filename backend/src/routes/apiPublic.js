const express = require("express");
const {
  getContracts,
  recordPresellEvent,
  resolvePresellRedirect,
  getPublicPresell
} = require("../controllers/publicApiController");
const {
  publicEventRateLimit,
  publicRedirectRateLimit
} = require("../middleware/publicRateLimit");

const router = express.Router();

router.get("/contracts", getContracts);
router.get("/presells/:slug", getPublicPresell);
router.post("/presells/:slug/events", publicEventRateLimit, recordPresellEvent);
router.post("/presells/:slug/redirect", publicRedirectRateLimit, resolvePresellRedirect);

module.exports = router;
