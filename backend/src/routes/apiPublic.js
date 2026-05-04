const express = require("express");
const {
  getContracts,
  recordPresellEvent,
  resolvePresellRedirect
} = require("../controllers/publicApiController");

const router = express.Router();

router.get("/contracts", getContracts);
router.post("/presells/:slug/events", recordPresellEvent);
router.post("/presells/:slug/redirect", resolvePresellRedirect);

module.exports = router;
