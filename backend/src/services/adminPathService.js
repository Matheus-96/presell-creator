const { getEnv } = require("../config/env");

function joinRoutePath(basePath, suffix = "") {
  if (!suffix || suffix === "/") {
    return basePath;
  }

  if (basePath === "/") {
    return suffix.startsWith("/") ? suffix : `/${suffix}`;
  }

  return `${basePath}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

function getAdminPathConfig() {
  const { adminEntryPath, adminFrontendPath, legacyAdminPath } = getEnv();

  return {
    adminEntryPath,
    adminFrontendPath,
    buildAdminFrontendPath(suffix = "") {
      return joinRoutePath(adminFrontendPath, suffix);
    },
    buildLegacyAdminPath(suffix = "") {
      return joinRoutePath(legacyAdminPath, suffix);
    },
    legacyAdminPath
  };
}

module.exports = {
  getAdminPathConfig,
  joinRoutePath
};
