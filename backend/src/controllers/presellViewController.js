const { renderTemplateRuntime } = require("../runtime");

function renderPresellPage(res, options) {
  return renderTemplateRuntime(res, options);
}

function renderPresellNotFound(res) {
  return res.status(404).render("presell/404", {
    title: "Presell nao encontrada",
    pixelHtml: ""
  });
}

module.exports = {
  renderPresellPage,
  renderPresellNotFound
};
