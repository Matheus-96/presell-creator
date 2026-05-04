function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlDocument({
  title,
  pixelHtml = "",
  preview = false,
  bodyClassName = "",
  bodyStyle = "",
  bodyMarkup,
  previewBridgeScript = ""
}) {
  const bodyClassAttribute = bodyClassName
    ? ` class="${escapeHtml(bodyClassName)}"`
    : "";
  const bodyStyleAttribute = bodyStyle
    ? ` style="${escapeHtml(bodyStyle)}"`
    : "";

  return [
    "<!doctype html>",
    "<html lang=\"pt-BR\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(title || "Presell")}</title>`,
    "<link rel=\"stylesheet\" href=\"/static/styles.css\">",
    pixelHtml || "",
    preview ? `<script>${previewBridgeScript}</script>` : "",
    "</head>",
    `<body${bodyClassAttribute}${bodyStyleAttribute}>`,
    bodyMarkup,
    "</body>",
    "</html>"
  ].join("");
}

module.exports = {
  renderHtmlDocument
};
