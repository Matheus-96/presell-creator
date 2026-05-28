const registry = require("./registry");
const settings = require("./settings");
const preview = require("./preview");

module.exports = {
  ...registry,
  ...settings,
  ...preview
};
