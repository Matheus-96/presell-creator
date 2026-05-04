const React = require("react");

function createAppAdChildren(viewModel) {
  const { presell, templateData } = viewModel;
  const children = [];

  if (templateData.labelText) {
    children.push(React.createElement("p", {
      className: "app-ad-label",
      key: "label"
    }, templateData.labelText));
  }

  if (templateData.imageUrl) {
    children.push(React.createElement(
      "figure",
      {
        className: "app-ad-media",
        key: "media"
      },
      React.createElement("img", {
        className: "app-ad-image",
        src: templateData.imageUrl,
        alt: ""
      })
    ));
  }

  children.push(React.createElement(
    "div",
    {
      className: "app-ad-copy",
      key: "copy"
    },
    React.createElement("h1", { className: "app-ad-headline" }, presell.headline),
    presell.subtitle
      ? React.createElement("p", { className: "app-ad-subtitle" }, presell.subtitle)
      : null,
    templateData.microcopy
      ? React.createElement("p", { className: "app-ad-microcopy" }, templateData.microcopy)
      : null
  ));

  children.push(React.createElement(
    "a",
    {
      className: templateData.buttonClassName,
      href: templateData.ctaHref,
      key: "cta"
    },
    templateData.ctaText
  ));

  if (templateData.disclaimer) {
    children.push(React.createElement("p", {
      className: "app-ad-disclaimer",
      key: "disclaimer"
    }, templateData.disclaimer));
  }

  return children;
}

module.exports = {
  createAppAdChildren
};
