const express = require("express");
const { requireApiAuth } = require("../middleware/auth");
const { attachCsrf, verifyApiCsrf } = require("../middleware/csrf");
const { upload } = require("../services/uploadService");
const {
  getContracts,
  getSession,
  postSession,
  deleteSession,
  getTemplates,
  postPreview,
  getPresellCollection,
  getPresell,
  createPresell,
  updatePresell,
  removePresell,
  duplicateExistingPresell,
  getAnalyticsOverview,
  getAnalyticsSummary,
  getAnalyticsPresellStatistics,
  postUpload
} = require("../controllers/adminApiController");

const router = express.Router();

router.use(attachCsrf);
router.get("/contracts", getContracts);
router.get("/session", getSession);
router.post("/session", verifyApiCsrf, postSession);
router.delete("/session", verifyApiCsrf, deleteSession);
router.get("/templates", requireApiAuth, getTemplates);
router.post("/previews", requireApiAuth, verifyApiCsrf, postPreview);
router.post("/uploads", requireApiAuth, verifyApiCsrf, upload.single("file"), postUpload);
router.get("/presells", requireApiAuth, getPresellCollection);
router.post("/presells", requireApiAuth, verifyApiCsrf, createPresell);
router.get("/presells/:id", requireApiAuth, getPresell);
router.patch("/presells/:id", requireApiAuth, verifyApiCsrf, updatePresell);
router.delete("/presells/:id", requireApiAuth, verifyApiCsrf, removePresell);
router.post("/presells/:id/duplicate", requireApiAuth, verifyApiCsrf, duplicateExistingPresell);
router.get("/analytics", requireApiAuth, getAnalyticsOverview);
router.get("/analytics/overview", requireApiAuth, getAnalyticsOverview);
router.get("/analytics/summary", requireApiAuth, getAnalyticsSummary);
router.get("/analytics/presells/:id", requireApiAuth, getAnalyticsPresellStatistics);

module.exports = router;
