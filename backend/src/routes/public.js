const express = require("express");
const {
  redirectToAdmin,
  redirectPublishedPresell
} = require("../controllers/publicController");

const router = express.Router();

router.get("/", redirectToAdmin);
router.get("/go/:slug", redirectPublishedPresell);

module.exports = router;
