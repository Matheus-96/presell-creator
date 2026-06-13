const express = require("express");
const { requireApiAuth } = require("../middleware/auth");
const { attachCsrf, verifyApiCsrf } = require("../middleware/csrf");
const {
  listV2,
  getV2,
  createV2,
  updateV2,
  removeV2
} = require("../controllers/adminPresellsV2Controller");

const router = express.Router();

router.use(attachCsrf);
router.get("/", requireApiAuth, listV2);
router.post("/", requireApiAuth, verifyApiCsrf, createV2);
router.get("/:id", requireApiAuth, getV2);
router.put("/:id", requireApiAuth, verifyApiCsrf, updateV2);
router.delete("/:id", requireApiAuth, verifyApiCsrf, removeV2);

module.exports = router;
