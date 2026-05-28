const { getTemplateManifest, listTemplateManifests } = require("./registry");

const CORE_PREVIEW_FIELD_DEFINITIONS = Object.freeze([
  {
    key: "headline",
    inputName: "headline",
    source: "core"
  },
  {
    key: "subtitle",
    inputName: "subtitle",
    source: "core"
  },
  {
    key: "body",
    inputName: "body",
    source: "core"
  },
  {
    key: "bullets",
    inputName: "bullets",
    source: "core"
  },
  {
    key: "cta_text",
    inputName: "cta_text",
    source: "core"
  }
]);

const TEMPLATE_CORE_SELECTOR_MAP = Object.freeze({
  advertorial: {
    headline: "h1",
    subtitle: ".lead",
    body: ".copy",
    bullets: ".benefits li",
    cta_text: ".cta"
  },
  review: {
    headline: "h1",
    subtitle: ".lead",
    body: ".copy",
    bullets: ".benefits li",
    cta_text: ".cta"
  },
  problem: {
    headline: "h1",
    subtitle: ".lead",
    body: ".copy",
    bullets: ".benefits li",
    cta_text: ".cta"
  },
  quiz: {
    headline: "h1",
    subtitle: ".lead",
    body: ".copy",
    bullets: ".quiz-options a",
    cta_text: ".cta"
  },
  "official-simple": {
    headline: "h1",
    subtitle: ".official-simple-subtitle",
    cta_text: ".official-simple-cta"
  },
  "offer-modal": {
    headline: "h1",
    subtitle: ".offer-modal-subtitle",
    cta_text: ".offer-modal-cta"
  },
  "device-frame": {
    headline: "h1",
    subtitle: ".device-frame-subtitle",
    bullets: ".device-frame-bullets li",
    cta_text: ".device-frame-cta"
  },
  "app-ad": {
    headline: "h1",
    subtitle: ".app-ad-subtitle",
    cta_text: ".app-ad-cta"
  },
  "app-ad-fullscreen": {
    headline: "h1",
    subtitle: ".app-ad-subtitle",
    cta_text: ".app-ad-cta"
  }
});

function getCorePreviewFields(templateId) {
  const selectorMap = TEMPLATE_CORE_SELECTOR_MAP[templateId] || TEMPLATE_CORE_SELECTOR_MAP.advertorial;

  return CORE_PREVIEW_FIELD_DEFINITIONS.flatMap((field) => (
    selectorMap[field.inputName]
      ? [{
        ...field,
        selector: selectorMap[field.inputName]
      }]
      : []
  ));
}

function getManifestPreviewFields(templateId) {
  return getTemplateManifest(templateId).fields
    .filter((field) => field.preview && field.preview.selector)
    .map((field) => ({
      key: field.key,
      inputName: field.inputName,
      selector: field.preview.selector,
      source: field.preview.source
    }));
}

function buildTemplatePreviewContract(templateId) {
  const manifest = getTemplateManifest(templateId);
  const fields = [...getCorePreviewFields(manifest.id), ...getManifestPreviewFields(manifest.id)];

  return {
    schemaVersion: 1,
    templateId: manifest.id,
    selectors: fields.reduce(
      (selectors, field) => ({
        ...selectors,
        [field.inputName]: field.selector
      }),
      {}
    ),
    fields
  };
}

function getTemplatePreviewContracts() {
  return listTemplateManifests().reduce(
    (contracts, manifest) => ({
      ...contracts,
      [manifest.id]: buildTemplatePreviewContract(manifest.id)
    }),
    {}
  );
}

module.exports = {
  CORE_PREVIEW_FIELD_DEFINITIONS,
  TEMPLATE_CORE_SELECTOR_MAP,
  getCorePreviewFields,
  buildTemplatePreviewContract,
  getTemplatePreviewContracts
};
