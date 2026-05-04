const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { attachCsrf, verifyCsrf } = require("../middleware/csrf");
const { uploadMultiple } = require("../services/uploadService");
const {
  getLogin,
  postLogin,
  postLogout,
  getDashboard,
  getNewPresellForm,
  postPresell,
  getEditPresellForm,
  getPresellPreview,
  getPresellStatisticsPage,
  postNewPresellPreview,
  postExistingPresellPreview,
  postDeletePresell,
  postDuplicatePresell
} = require("../controllers/adminController");

const router = express.Router();

router.use(attachCsrf);

router.get("/login", getLogin);
router.post("/login", verifyCsrf, postLogin);
router.post("/logout", verifyCsrf, postLogout);
router.get("/", requireAuth, getDashboard);
router.get("/presells/new", requireAuth, getNewPresellForm);

router.post(
  "/presells",
  requireAuth,
  uploadMultiple,
  verifyCsrf,
  postPresell
);

router.get("/presells/:id/edit", requireAuth, getEditPresellForm);

router.post(
  "/presells/:id",
  requireAuth,
  uploadMultiple,
  verifyCsrf,
  postPresell
);

router.get("/presells/:id/preview", requireAuth, getPresellPreview);
router.get("/presells/:id/statistics", requireAuth, getPresellStatisticsPage);
router.post("/api/presells/preview", requireAuth, verifyCsrf, postNewPresellPreview);
router.post("/api/presells/:id/preview", requireAuth, verifyCsrf, postExistingPresellPreview);
router.post("/presells/:id/delete", requireAuth, verifyCsrf, postDeletePresell);
router.post("/presells/:id/duplicate", requireAuth, verifyCsrf, postDuplicatePresell);

module.exports = router;
