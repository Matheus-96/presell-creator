const createApp = require("./bootstrap/createApp");
const { loadEnv } = require("./config/env");

loadEnv();

module.exports = createApp();
