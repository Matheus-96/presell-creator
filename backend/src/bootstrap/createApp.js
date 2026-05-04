const express = require("express");
const session = require("express-session");

const { getEnv } = require("../config/env");
const { publicDir, viewsDir } = require("../config/paths");
const { getHealth } = require("../controllers/healthController");
const { getAdminSummary } = require("../controllers/summaryController");
const { migrate } = require("../db/migrations");
const { SQLiteSessionStore } = require("../db/sessionStore");
const errorHandler = require("../middleware/errorHandler");
const notFound = require("../middleware/notFound");
const { buildMediaUrl } = require("../services/mediaPathService");
const adminRoutes = require("../routes/admin");
const apiAdminRoutes = require("../routes/apiAdmin");
const apiPublicRoutes = require("../routes/apiPublic");
const {
  createAdminFrontendRouter,
  hasBuiltAdminFrontend
} = require("../routes/adminFrontend");
const assetRoutes = require("../routes/assets");
const publicRoutes = require("../routes/public");
const { getAdminPathConfig } = require("../services/adminPathService");

function createApp() {
  const {
    sessionCookieSameSite,
    sessionCookieSecure,
    sessionSecret,
    trustProxy
  } = getEnv();

  migrate();

  const app = express();
  const adminPathConfig = getAdminPathConfig();
  const adminFrontendBuilt = hasBuiltAdminFrontend();

  app.set("view engine", "ejs");
  app.set("views", viewsDir);
  app.locals.nl2br = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
  app.locals.adminEntryPath = adminPathConfig.adminEntryPath;
  app.locals.adminFrontendBuilt = adminFrontendBuilt;
  app.locals.adminFrontendPath = adminPathConfig.adminFrontendPath;
  app.locals.adminFrontendUrl = adminPathConfig.buildAdminFrontendPath;
  app.locals.adminUrl = adminPathConfig.buildLegacyAdminPath;
  app.locals.legacyAdminPath = adminPathConfig.legacyAdminPath;
  app.locals.mediaUrl = buildMediaUrl;

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }

  app.use(session({
    name: "presell.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteSessionStore(),
    proxy: trustProxy !== false,
    cookie: {
      httpOnly: true,
      sameSite: sessionCookieSameSite,
      secure: sessionCookieSecure,
      maxAge: 1000 * 60 * 60 * 8
    }
  }));

  app.get("/health", getHealth);
  app.use("/static", express.static(publicDir));
  app.use("/media", assetRoutes);
  if (adminFrontendBuilt) {
    app.use(adminPathConfig.adminFrontendPath, createAdminFrontendRouter());
  }
  app.use("/", publicRoutes);
  app.use(adminPathConfig.legacyAdminPath, adminRoutes);
  app.use("/api/admin", apiAdminRoutes);
  app.use("/api/public", apiPublicRoutes);
  app.get("/api/admin/summary", getAdminSummary);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
