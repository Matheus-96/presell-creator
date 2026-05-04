const { getAdminPathConfig } = require("../services/adminPathService");
const { hasBuiltAdminFrontend } = require("../routes/adminFrontend");

function getScaffoldStatus(req, res) {
  res.json({
    service: "presell-backend",
    status: "scaffold-ready",
    nextStep: "split-t02"
  });
}

function getHealth(req, res) {
  const { adminEntryPath, adminFrontendPath, legacyAdminPath } = getAdminPathConfig();

  res.json({
    admin: {
      entryPath: adminEntryPath,
      frontendBuilt: hasBuiltAdminFrontend(),
      frontendPath: adminFrontendPath,
      legacyPath: legacyAdminPath
    },
    ok: true,
    service: "presell-backend"
  });
}

module.exports = {
  getScaffoldStatus,
  getHealth
};
