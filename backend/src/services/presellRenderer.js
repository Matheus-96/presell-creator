const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { serializePublicPresell } = require("../contracts");

// Bundle gerado em build time por scripts/build-templates.js. Contém o mapa
// templateId -> ReactComponent dos templates do frontend.
const { registry } = require("../templates/templates.bundle.js");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderGooglePixel(googlePixelId) {
  if (!googlePixelId) return "";

  const id = escapeHtml(googlePixelId);
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>` +
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
    `gtag('js',new Date());gtag('config','${id}');</script>`;
}

function renderHead(publicData) {
  const title = escapeHtml(publicData.headline || publicData.slug);
  const description = escapeHtml(publicData.subtitle || "");
  const canonical = `/p/${escapeHtml(publicData.slug)}`;

  return [
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    renderGooglePixel(publicData.googlePixelId)
  ]
    .filter(Boolean)
    .join("\n    ");
}

function renderPresellHtml(presell) {
  const publicData = serializePublicPresell(presell);
  const Template = registry[publicData.templateId];

  if (!Template) {
    throw new Error(
      `Template "${publicData.templateId}" não encontrado no bundle de templates.`
    );
  }

  const body = renderToStaticMarkup(createElement(Template, { presell: publicData }));

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    ${renderHead(publicData)}
  </head>
  <body>${body}</body>
</html>`;
}

module.exports = { renderPresellHtml };
