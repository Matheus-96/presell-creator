const express = require("express");
const session = require("express-session");
const compression = require("compression");

const { setStaticAssetCacheHeaders } = require("../config/cacheControl");
const { getEnv } = require("../config/env");
const { publicDir, viewsDir } = require("../config/paths");
const { migrate } = require("../db/migrations");
// Run migrations immediately so modules that prepare SQL statements
// (repositories) see the updated schema when they are required below.
migrate();
const { getHealth } = require("../controllers/healthController");
const { getAdminSummary } = require("../controllers/summaryController");
const { SQLiteSessionStore } = require("../db/sessionStore");
const errorHandler = require("../middleware/errorHandler");
const notFound = require("../middleware/notFound");
const { buildMediaUrl } = require("../services/mediaPathService");
const apiAdminRoutes = require("../routes/apiAdmin");
const apiAdminPresellsV2Routes = require("../routes/apiAdminPresellsV2");
const apiAdminPresellsV2AnalyzeUrlRoutes = require("../routes/apiAdminPresellsV2AnalyzeUrl");
const apiMediaRouter = require("../routes/apiMedia");
const apiAnalyzeUrlRouter = require("../routes/apiAnalyzeUrl");
const apiPocRoutes = require("../routes/apiPoc");
const apiPublicRoutes = require("../routes/apiPublic");
const {
  createAdminFrontendRouter,
  createPublicPresellHandler,
  createPresellCssHandler,
  hasBuiltAdminFrontend
} = require("../routes/adminFrontend");
const assetRoutes = require("../routes/assets");
const publicRoutes = require("../routes/public");

function createApp() {
  const {
    adminFrontendPath,
    sessionCookieSameSite,
    sessionCookieSecure,
    sessionSecret,
    trustProxy
  } = getEnv();

  // migrations already applied at module load to ensure repository
  // statements see the correct schema.

  const app = express();
  const adminFrontendBuilt = hasBuiltAdminFrontend();

  app.set("view engine", "ejs");
  app.set("views", viewsDir);
  app.locals.nl2br = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
  app.locals.mediaUrl = buildMediaUrl;

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }
  app.use(compression({
    filter: compression.filter,
    threshold: "1kb"
  }));

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
  app.use("/static", express.static(publicDir, {
    setHeaders: setStaticAssetCacheHeaders
  }));
  app.use("/media", assetRoutes);
  app.get("/assets/presell.css", createPresellCssHandler());
  app.use("/p", createPublicPresellHandler());
  if (adminFrontendBuilt) {
    app.use(adminFrontendPath, createAdminFrontendRouter());
  }
  app.use("/", publicRoutes);
  app.use("/api/admin", apiAdminRoutes);
  app.use("/api/admin/presells-v2/analyze-url", apiAdminPresellsV2AnalyzeUrlRoutes);
  app.use("/api/admin/presells-v2", apiAdminPresellsV2Routes);
  app.use("/api/admin/media", apiMediaRouter);
  app.use("/api/admin/presells/analyze-url", apiAnalyzeUrlRouter);
  app.use("/api/admin/poc", apiPocRoutes);
  app.use("/api/public", apiPublicRoutes);
  app.get("/api/admin/summary", getAdminSummary);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
