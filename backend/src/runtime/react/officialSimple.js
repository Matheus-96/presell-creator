const React = require("react");
const { renderStaticReactTemplate } = require("./shared");

function OfficialSimpleTemplate({ viewModel }) {
  const { presell, templateData } = viewModel;

  return React.createElement(
    "main",
    {
      className: "official-simple-shell",
      style: { "--official-simple-accent": templateData.accentColor }
    },
    React.createElement(
      "section",
      { className: "official-simple-panel" },
      templateData.badgeText
        ? React.createElement("p", { className: "official-simple-badge" }, templateData.badgeText)
        : null,
      React.createElement(
        "div",
        { className: "official-simple-copy" },
        React.createElement("h1", { className: "official-simple-headline" }, presell.headline),
        presell.subtitle
          ? React.createElement("p", { className: "official-simple-subtitle" }, presell.subtitle)
          : null
      ),
      templateData.trustBadges.length
        ? React.createElement(
          "ul",
          { className: "official-simple-trust-list" },
          templateData.trustBadges.map((item, index) => React.createElement(
            "li",
            {
              className: "official-simple-trust-item",
              key: `${item}-${index}`
            },
            item
          ))
        )
        : null,
      React.createElement(
        "a",
        {
          className: "official-simple-cta",
          href: templateData.ctaHref
        },
        templateData.ctaText,
        templateData.showArrows
          ? React.createElement("span", { "aria-hidden": "true" }, " \u2192")
          : null
      )
    )
  );
}

function renderOfficialSimpleTemplate(viewModel) {
  return renderStaticReactTemplate(viewModel, {
    bodyClassName: "public-body official-simple-body",
    Component: OfficialSimpleTemplate
  });
}

const officialSimpleReactRenderer = Object.freeze({
  templateId: "official-simple",
  entry: "runtime/react/official-simple",
  render: renderOfficialSimpleTemplate
});

module.exports = {
  OfficialSimpleTemplate,
  officialSimpleReactRenderer,
  renderOfficialSimpleTemplate
};
