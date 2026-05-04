const express = require("express");
const {
  redirectToAdmin,
  getPublishedPresellPage,
  redirectPublishedPresell
} = require("../controllers/publicController");

const router = express.Router();

router.get("/", redirectToAdmin);
router.get("/p/:slug", getPublishedPresellPage);
router.get("/go/:slug", redirectPublishedPresell);

module.exports = router;
