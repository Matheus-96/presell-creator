const path = require("path");
const dotenv = require("dotenv");

const { rootEnvFile } = require("./paths");

let didLoadEnv = false;

function loadEnv() {
  if (didLoadEnv) {
    return process.env;
  }

  dotenv.config({ path: rootEnvFile });

  const cwdEnvFile = path.resolve(process.cwd(), ".env");
  if (cwdEnvFile !== rootEnvFile) {
    dotenv.config({ path: cwdEnvFile });
  }

  didLoadEnv = true;
  return process.env;
}

function parsePort(value, fallback) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

function parseBoolean(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseTrustProxy(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return 1;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return value.trim();
}

function parseSameSite(value, fallback = "lax") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return ["lax", "strict", "none"].includes(normalized) ? normalized : fallback;
}

function normalizeRoutePath(value, fallback) {
  const normalized = typeof value === "string" ? value.trim() : "";
  const basePath = normalized || fallback;
  if (basePath === "/") {
    return "/";
  }

  return `/${basePath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function parseSessionCookieSecure(value, { fallback, sameSite, forceHttps }) {
  if (forceHttps || sameSite === "none") {
    return true;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "auto") {
    return "auto";
  }

  return parseBoolean(normalized, fallback);
}

const PAGE_EXTRACTOR_VALUES = ["puppeteer", "fetch"];

function parsePageExtractor(value, fallback = "puppeteer") {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!PAGE_EXTRACTOR_VALUES.includes(normalized)) {
    throw new Error(
      `Invalid PAGE_EXTRACTOR value "${value}". Must be one of: ${PAGE_EXTRACTOR_VALUES.join(", ")}`
    );
  }

  return normalized;
}

function getEnv() {
  loadEnv();

  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  const forceHttps = parseBoolean(process.env.FORCE_HTTPS, false);
  const sessionCookieSameSite = parseSameSite(process.env.SESSION_COOKIE_SAME_SITE, "lax");
  const sessionCookieSecure = parseSessionCookieSecure(process.env.SESSION_COOKIE_SECURE, {
    fallback: nodeEnv === "production" ? "auto" : false,
    sameSite: sessionCookieSameSite,
    forceHttps
  });
  const trustProxy = parseTrustProxy(
    process.env.TRUST_PROXY,
    sessionCookieSecure === true || sessionCookieSecure === "auto" ? 1 : false
  );
  const adminFrontendPath = normalizeRoutePath(process.env.ADMIN_FRONTEND_PATH, "/admin");

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey || !openRouterApiKey.trim()) {
    throw new Error("Missing required environment variable: OPENROUTER_API_KEY");
  }

  return {
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
    adminFrontendPath,
    adminUser: process.env.ADMIN_USER || "admin",
    backendPort: parsePort(process.env.BACKEND_PORT || process.env.PORT, 3002),
    compatibilityPort: parsePort(process.env.PORT, 3001),
    forceHttps,
    nodeEnv,
    openRouterApiKey: openRouterApiKey.trim(),
    pageExtractor: parsePageExtractor(process.env.PAGE_EXTRACTOR, "puppeteer"),
    sessionSecret: process.env.SESSION_SECRET || "development-secret",
    sessionCookieSameSite,
    sessionCookieSecure,
    trustProxy
  };
}

module.exports = {
  getEnv,
  loadEnv,
  normalizeRoutePath
};
