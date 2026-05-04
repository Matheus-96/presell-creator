const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { renderHtmlDocument } = require("./document");

function renderStaticReactTemplate(viewModel, options) {
  const { bodyClassName, bodyStyle = "", Component } = options;
  const bodyMarkup = renderToStaticMarkup(React.createElement(Component, { viewModel }));

  return renderHtmlDocument({
    title: viewModel.title,
    pixelHtml: viewModel.pixelHtml,
    preview: viewModel.preview,
    bodyClassName,
    bodyStyle,
    bodyMarkup,
    previewBridgeScript: viewModel.previewBridgeScript
  });
}

function renderTextWithLineBreaks(value) {
  const lines = String(value || "").split(/\r?\n/);

  return lines.flatMap((line, index) => (
    index === lines.length - 1
      ? [line]
      : [line, React.createElement("br", { key: `line-break-${index}` })]
  ));
}

function EyebrowHeadline({
  eyebrow,
  headline,
  headlineClass,
  subtitle,
  subtitleClass
}) {
  const resolvedHeadlineClass = headlineClass !== undefined ? headlineClass : "article h1";
  const resolvedSubtitleClass = subtitleClass !== undefined ? subtitleClass : "lead";

  return React.createElement(
    React.Fragment,
    null,
    eyebrow
      ? React.createElement("p", { className: "eyebrow" }, eyebrow)
      : null,
    React.createElement("h1", { className: resolvedHeadlineClass }, headline),
    subtitle
      ? React.createElement("p", { className: resolvedSubtitleClass }, subtitle)
      : null
  );
}

function PresellImage({ className = "hero-img", imageUrl }) {
  if (!imageUrl) {
    return null;
  }

  return React.createElement(
    "figure",
    { className },
    React.createElement("img", {
      src: imageUrl,
      alt: ""
    })
  );
}

function MultilineCopy({ className = "copy", text }) {
  return React.createElement("div", { className }, renderTextWithLineBreaks(text));
}

function BenefitsList({ className = "benefits", items = [] }) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  return React.createElement(
    "ul",
    { className },
    items.map((item, index) => React.createElement(
      "li",
      { key: `${item}-${index}` },
      item
    ))
  );
}

function CtaLink({ className = "cta", href, text }) {
  return React.createElement("a", { className, href }, text);
}

module.exports = {
  renderStaticReactTemplate,
  renderTextWithLineBreaks,
  EyebrowHeadline,
  PresellImage,
  MultilineCopy,
  BenefitsList,
  CtaLink
};
