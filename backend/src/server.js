const app = require("./app");
const startServer = require("./bootstrap/startServer");
const { getEnv } = require("./config/env");

const { backendPort } = getEnv();

if (require.main === module) {
  startServer(app, { port: backendPort, serviceName: "Presell backend" });
}

module.exports = app;
module.exports.startServer = startServer;
