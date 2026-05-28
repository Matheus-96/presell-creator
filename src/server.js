const { getEnv, loadEnv } = require("../backend/src/config/env");
const startServer = require("../backend/src/bootstrap/startServer");

loadEnv();

const app = require("../backend/src/app");

if (require.main === module) {
  const { compatibilityPort } = getEnv();
  startServer(app, { port: compatibilityPort, serviceName: "Presell server" });
}

module.exports = app;
module.exports.startServer = startServer;
