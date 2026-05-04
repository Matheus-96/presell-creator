const React = require("react");
const { renderStaticReactTemplate } = require("./shared");

function OfferModalTemplate({ viewModel }) {
  const { presell, templateData } = viewModel;

  return React.createElement(
    "main",
    {
      className: "offer-modal-shell",
      style: { "--offer-modal-overlay-strength": templateData.overlayStrength }
    },
    React.createElement(
      "section",
      { className: "offer-modal-backdrop" },
      templateData.backgroundImageUrl
        ? React.createElement("img", {
          className: "offer-modal-hero-image",
          src: templateData.backgroundImageUrl,
          alt: ""
        })
        : null,
      React.createElement("div", {
        className: "offer-modal-overlay",
        "aria-hidden": "true"
      })
    ),
    React.createElement(
      "section",
      {
        className: "offer-modal-card",
        "aria-labelledby": "offer-modal-title"
      },
      templateData.discountText
        ? React.createElement("p", { className: "offer-modal-discount" }, templateData.discountText)
        : null,
      React.createElement(
        "h1",
        {
          id: "offer-modal-title",
          className: "offer-modal-headline"
        },
        presell.headline
      ),
      presell.subtitle
        ? React.createElement("p", { className: "offer-modal-subtitle" }, presell.subtitle)
        : null,
      templateData.ratingLabel
        ? React.createElement(
          "div",
          {
            className: "offer-modal-rating",
            "aria-label": templateData.ratingLabel
          },
          templateData.starsText
            ? React.createElement("span", { className: "offer-modal-stars" }, templateData.starsText)
            : null,
          templateData.rating
            ? React.createElement("span", { className: "offer-modal-rating-value" }, templateData.rating)
            : null
        )
        : null,
      templateData.scarcityText
        ? React.createElement("p", { className: "offer-modal-scarcity" }, templateData.scarcityText)
        : null,
      React.createElement(
        "a",
        {
          className: "offer-modal-cta",
          href: templateData.ctaHref
        },
        templateData.ctaText
      )
    )
  );
}

function renderOfferModalTemplate(viewModel) {
  return renderStaticReactTemplate(viewModel, {
    bodyClassName: "public-body offer-modal-body",
    Component: OfferModalTemplate
  });
}

const offerModalReactRenderer = Object.freeze({
  templateId: "offer-modal",
  entry: "runtime/react/offer-modal",
  render: renderOfferModalTemplate
});

module.exports = {
  OfferModalTemplate,
  offerModalReactRenderer,
  renderOfferModalTemplate
};
