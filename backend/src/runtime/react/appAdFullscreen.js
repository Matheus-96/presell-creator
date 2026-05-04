const React = require("react");
const { renderStaticReactTemplate } = require("./shared");
const { createAppAdChildren } = require("./appAdShared");

function AppAdFullscreenTemplate({ viewModel }) {
  return React.createElement(
    "div",
    { className: "app-ad-fullscreen-overlay" },
    React.createElement(
      "div",
      { className: "app-ad-fullscreen-card" },
      createAppAdChildren(viewModel)
    )
  );
}

function renderAppAdFullscreenTemplate(viewModel) {
  const { templateData } = viewModel;

  return renderStaticReactTemplate(viewModel, {
    bodyClassName: "public-body app-ad-body app-ad-fullscreen-shell",
    bodyStyle: templateData.backgroundImageUrl
      ? `background-image: url("${templateData.backgroundImageUrl}");`
      : "",
    Component: AppAdFullscreenTemplate
  });
}

const appAdFullscreenReactRenderer = Object.freeze({
  templateId: "app-ad-fullscreen",
  entry: "runtime/react/app-ad-fullscreen",
  render: renderAppAdFullscreenTemplate
});

module.exports = {
  AppAdFullscreenTemplate,
  appAdFullscreenReactRenderer,
  renderAppAdFullscreenTemplate
};
