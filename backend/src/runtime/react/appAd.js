const React = require("react");
const { renderStaticReactTemplate } = require("./shared");
const { createAppAdChildren } = require("./appAdShared");

function AppAdTemplate({ viewModel }) {
  const { templateData } = viewModel;

  return React.createElement(
    "main",
    {
      className: `app-ad-shell app-ad-density-${templateData.layoutDensity}`
    },
    React.createElement(
      "article",
      { className: "app-ad-card" },
      createAppAdChildren(viewModel)
    )
  );
}

function renderAppAdTemplate(viewModel) {
  return renderStaticReactTemplate(viewModel, {
    bodyClassName: "public-body app-ad-body",
    Component: AppAdTemplate
  });
}

const appAdReactRenderer = Object.freeze({
  templateId: "app-ad",
  entry: "runtime/react/app-ad",
  render: renderAppAdTemplate
});

module.exports = {
  AppAdTemplate,
  appAdReactRenderer,
  renderAppAdTemplate
};
