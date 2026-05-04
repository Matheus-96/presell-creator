const { renderTemplateRuntimeToHtml, createPresellDraft } = require("../runtime");
const { getTemplateDefinition } = require("./presellTemplates");
const { getPresellById } = require("./presellService");
const { normalizeMediaPath } = require("./mediaPathService");

function buildPreviewError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function hasMediaField(rawPresell, key) {
  return Boolean(rawPresell && rawPresell.media) && hasOwn(rawPresell.media, key);
}

function isRemovalRequested(value) {
  return value === true || value === "true" || value === "1" || value === 1 || value === "on";
}

function getRawPreviewInput(payload = {}) {
  if (payload.presell && typeof payload.presell === "object" && !Array.isArray(payload.presell)) {
    return payload.presell;
  }

  return payload && typeof payload === "object" ? payload : {};
}

function getBasePresell(basePresellId) {
  if (!Number.isInteger(basePresellId)) {
    return createPresellDraft();
  }

  const presell = getPresellById(basePresellId);
  if (!presell) {
    throw buildPreviewError(
      "presell_not_found",
      "No presell matches the requested id.",
      { id: basePresellId }
    );
  }

  return presell;
}

function resolveField(rawPresell, aliases, fallbackValue = "") {
  const matchingAlias = aliases.find((alias) => hasOwn(rawPresell, alias));
  return matchingAlias ? rawPresell[matchingAlias] : fallbackValue;
}

function resolveMediaPath({
  rawPresell,
  basePresell,
  mediaKey,
  removeKey,
  currentPathKey,
  basePathKey
}) {
  if (isRemovalRequested(rawPresell[removeKey])) {
    return "";
  }

  if (hasMediaField(rawPresell, mediaKey)) {
    const mediaReference = rawPresell.media[mediaKey];
    return mediaReference && typeof mediaReference === "object"
      ? normalizeMediaPath(mediaReference.fileName || mediaReference.path || mediaReference.url || "")
      : "";
  }

  if (hasOwn(rawPresell, currentPathKey)) {
    return normalizeMediaPath(String(rawPresell[currentPathKey] || ""));
  }

  return normalizeMediaPath(String(basePresell[basePathKey] || ""));
}

function buildPreviewDraft(payload = {}) {
  const rawPresell = getRawPreviewInput(payload);
  const requestedBasePresellId = hasOwn(payload, "basePresellId")
    ? Number(payload.basePresellId)
    : null;
  const basePresellId = Number.isInteger(requestedBasePresellId)
    ? requestedBasePresellId
    : null;
  const basePresell = getBasePresell(basePresellId);
  const templateId = String(
    resolveField(rawPresell, ["templateId", "template"], basePresell.template || "advertorial")
      || "advertorial"
  );
  const template = getTemplateDefinition(templateId);
  const previewPresell = {
    ...createPresellDraft(basePresell),
    slug: String(resolveField(rawPresell, ["slug"], basePresell.slug || "")),
    status: resolveField(rawPresell, ["status"], basePresell.status || "draft") === "published"
      ? "published"
      : "draft",
    template: template.id,
    title: String(resolveField(rawPresell, ["title"], basePresell.title || "")),
    headline: String(resolveField(rawPresell, ["headline"], basePresell.headline || "")),
    subtitle: String(resolveField(rawPresell, ["subtitle"], basePresell.subtitle || "")),
    body: String(resolveField(rawPresell, ["body"], basePresell.body || "")),
    bullets: Array.isArray(rawPresell.bullets)
      ? rawPresell.bullets.join("\n")
      : String(resolveField(rawPresell, ["bullets", "bullets_text"], basePresell.bullets || "")),
    cta_text: String(resolveField(rawPresell, ["ctaText", "cta_text"], basePresell.cta_text || "Continuar")),
    affiliate_url: String(
      resolveField(rawPresell, ["affiliateUrl", "affiliate_url"], basePresell.affiliate_url || "")
    ),
    google_pixel: resolveField(
      rawPresell,
      ["googlePixelId", "google_pixel"],
      basePresell.google_pixel || null
    ),
    image_path: resolveMediaPath({
      rawPresell,
      basePresell,
      mediaKey: "heroImage",
      removeKey: "remove_image",
      currentPathKey: "current_image_path",
      basePathKey: "image_path"
    }),
    background_image_path: resolveMediaPath({
      rawPresell,
      basePresell,
      mediaKey: "backgroundImage",
      removeKey: "remove_background_image",
      currentPathKey: "current_background_image_path",
      basePathKey: "background_image_path"
    })
  };

  return {
    basePresellId,
    basePresell,
    presell: previewPresell,
    postedSettings: rawPresell.settings && typeof rawPresell.settings === "object" && !Array.isArray(rawPresell.settings)
      ? rawPresell.settings
      : null
  };
}

function toPreviewTitle(presell, basePresellId) {
  const label = String(presell.title || presell.headline || "").trim()
    || (Number.isInteger(basePresellId) ? "Presell" : "Nova presell");
  return `Preview - ${label}`;
}

async function buildPreviewDocument(app, payload = {}) {
  const previewDraft = buildPreviewDraft(payload);
  const { html, viewModel } = await renderTemplateRuntimeToHtml(app, {
    title: toPreviewTitle(previewDraft.presell, previewDraft.basePresellId),
    presell: previewDraft.presell,
    preview: true,
    postedSettings: previewDraft.postedSettings,
    existingPresell: Number.isInteger(previewDraft.basePresellId) ? previewDraft.basePresell : null
  });

  return {
    html,
    presell: viewModel.presell,
    template: viewModel.template,
    runtime: viewModel.runtime
  };
}

module.exports = {
  buildPreviewDraft,
  buildPreviewDocument
};
