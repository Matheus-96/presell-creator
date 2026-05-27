const { getEnv } = require("../config/env");
const { hasBuiltAdminFrontend } = require("../routes/adminFrontend");

function getScaffoldStatus(req, res) {
  res.json({
    service: "presell-backend",
    status: "scaffold-ready",
    nextStep: "split-t02"
  });
}

function getHealth(req, res) {
  const { adminFrontendPath } = getEnv();

  res.json({
    admin: {
      frontendBuilt: hasBuiltAdminFrontend(),
      frontendPath: adminFrontendPath
    },
    ok: true,
    service: "presell-backend"
  });
}

module.exports = {
  getScaffoldStatus,
  getHealth
};
