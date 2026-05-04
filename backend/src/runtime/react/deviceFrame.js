const React = require("react");
const { renderStaticReactTemplate } = require("./shared");

function DeviceFrameTemplate({ viewModel }) {
  const { presell, templateData } = viewModel;

  return React.createElement(
    "main",
    {
      className: `device-frame-shell device-frame-shell-${templateData.frameType}`
    },
    React.createElement(
      "section",
      { className: "device-frame-stage" },
      React.createElement(
        "article",
        {
          className: `device-frame-window device-frame-window-${templateData.frameType}`
        },
        React.createElement(
          "header",
          { className: "device-frame-top-bar" },
          React.createElement(
            "div",
            {
              className: "device-frame-controls",
              "aria-hidden": "true"
            },
            React.createElement("span", { className: "device-frame-control" }),
            React.createElement("span", { className: "device-frame-control" }),
            React.createElement("span", { className: "device-frame-control" })
          ),
          templateData.topBarText
            ? React.createElement("p", { className: "device-frame-top-text" }, templateData.topBarText)
            : null
        ),
        React.createElement(
          "div",
          { className: "device-frame-content" },
          templateData.imageUrl
            ? React.createElement(
              "figure",
              { className: "device-frame-image" },
              React.createElement("img", {
                src: templateData.imageUrl,
                alt: ""
              })
            )
            : null,
          React.createElement(
            "section",
            { className: "device-frame-copy" },
            templateData.offerNote
              ? React.createElement("p", { className: "device-frame-offer-note" }, templateData.offerNote)
              : null,
            React.createElement("h1", { className: "device-frame-headline" }, presell.headline),
            presell.subtitle
              ? React.createElement("p", { className: "device-frame-subtitle" }, presell.subtitle)
              : null,
            templateData.visibleBullets.length
              ? React.createElement(
                "ul",
                { className: "device-frame-bullets" },
                templateData.visibleBullets.map((item, index) => React.createElement(
                  "li",
                  { key: `${item}-${index}` },
                  item
                ))
              )
              : null,
            React.createElement(
              "a",
              {
                className: "device-frame-cta",
                href: templateData.ctaHref
              },
              templateData.ctaText
            )
          )
        ),
        templateData.footerLeftText || templateData.footerRightText
          ? React.createElement(
            "footer",
            { className: "device-frame-footer" },
            React.createElement("span", { className: "device-frame-footer-left" }, templateData.footerLeftText),
            React.createElement("span", { className: "device-frame-footer-right" }, templateData.footerRightText)
          )
          : null
      )
    )
  );
}

function renderDeviceFrameTemplate(viewModel) {
  return renderStaticReactTemplate(viewModel, {
    bodyClassName: "public-body device-frame-body",
    Component: DeviceFrameTemplate
  });
}

const deviceFrameReactRenderer = Object.freeze({
  templateId: "device-frame",
  entry: "runtime/react/device-frame",
  render: renderDeviceFrameTemplate
});

module.exports = {
  DeviceFrameTemplate,
  deviceFrameReactRenderer,
  renderDeviceFrameTemplate
};
