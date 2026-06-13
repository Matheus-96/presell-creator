const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Bundle gerado em build time por scripts/build-sections.js. Contém o mapa
// type -> ReactComponent das seções do V2 (hero/faq/testimonials/footer).
const { registry } = require("../templates/sections.bundle.js");

function renderSection(section, index) {
  const Component = registry[section.type];
  if (!Component) return "";
  const props = section && typeof section.props === "object" && section.props
    ? section.props
    : {};
  return renderToStaticMarkup(
    createElement(Component, { props, key: index })
  );
}

function renderSectionsToHtml(sections) {
  const ordered = Array.isArray(sections)
    ? [...sections].sort((a, b) => {
        const oa = Number.isFinite(a?.order) ? a.order : 0;
        const ob = Number.isFinite(b?.order) ? b.order : 0;
        return oa - ob;
      })
    : [];

  const body = ordered
    .map((section, index) => renderSection(section, index))
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Presell</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
${body}
  </body>
</html>`;
}

module.exports = { renderSectionsToHtml };
