const rendererRegistry = require("./rendererRegistry");
const templateRuntime = require("./templateRuntime");

module.exports = {
  ...rendererRegistry,
  ...templateRuntime
};
