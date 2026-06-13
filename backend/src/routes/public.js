const express = require("express");
const {
  redirectToAdmin,
  redirectPublishedPresell,
  getPublicPresellV2
} = require("../controllers/publicController");

const router = express.Router();

router.get("/", redirectToAdmin);
router.get("/go/:slug", redirectPublishedPresell);
router.get("/lp/:slug", getPublicPresellV2);

module.exports = router;
