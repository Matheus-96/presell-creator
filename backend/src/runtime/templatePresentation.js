const { buildMediaUrl } = require("../services/mediaPathService");

function splitMultilineValue(value, options = {}) {
  const { limit = Infinity } = options;

  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1 || value === "on";
}

function resolveTemplateCtaHref(viewModel) {
  return viewModel.preview
    ? "#"
    : `/go/${encodeURIComponent(viewModel.presell.slug || "")}${viewModel.trackingQuery || ""}`;
}

function resolveTemplateCtaText(presell, options = {}) {
  const { override = null, appendArrow = false } = options;
  const baseText = String(override || presell.cta_text || "Continuar");

  return appendArrow ? `${baseText} →` : baseText;
}

function toMediaUrl(mediaPath) {
  return buildMediaUrl(mediaPath);
}

const QUIZ_DEFAULT_OPTIONS = Object.freeze([
  "Sim, quero ver a recomendacao",
  "Quero entender melhor"
]);

const articlePresentationContent = Object.freeze({
  advertorial: {
    eyebrowText: "Especial",
    headlineClass: "article h1",
    subtitleClass: "lead",
    disclaimerText: "Conteudo informativo. Ao continuar, voce sera direcionado para a pagina oficial da oferta."
  },
  review: {
    eyebrowText: "Análise rápida",
    headlineClass: "",
    subtitleClass: "lead",
    disclaimerText: "Esta pagina pode conter link de afiliado."
  },
  problem: {
    eyebrowText: "Problema e solução",
    headlineClass: "",
    subtitleClass: "lead"
  },
  quiz: {
    eyebrowText: "Quiz rápido",
    headlineClass: "",
    subtitleClass: "lead",
    quizOptionsFallback: QUIZ_DEFAULT_OPTIONS
  }
});

function readPresentationValue(config, key, fallbackValue) {
  return Object.prototype.hasOwnProperty.call(config, key)
    ? config[key]
    : fallbackValue;
}

function buildArticlePresentation(viewModel) {
  const config = articlePresentationContent[viewModel.template.id] || {};
  let quizOptions = [];

  if (viewModel.template.id === "quiz") {
    if (viewModel.bullets.length) {
      quizOptions = [...viewModel.bullets];
    } else {
      quizOptions = [...readPresentationValue(config, "quizOptionsFallback", QUIZ_DEFAULT_OPTIONS)];
    }
  }

  return {
    ctaHref: resolveTemplateCtaHref(viewModel),
    ctaText: resolveTemplateCtaText(viewModel.presell),
    disclaimerText: String(readPresentationValue(config, "disclaimerText", "")),
    eyebrowText: String(readPresentationValue(config, "eyebrowText", "")),
    headlineClass: String(readPresentationValue(config, "headlineClass", "article h1")),
    imageUrl: toMediaUrl(viewModel.presell.image_path),
    quizOptions,
    subtitleClass: String(readPresentationValue(config, "subtitleClass", "lead"))
  };
}

function buildOfficialSimplePresentation(viewModel) {
  const showArrows = normalizeBoolean(viewModel.settings.show_arrows);

  return {
    accentColor: String(viewModel.settings.accent_color || "#0f766e"),
    badgeText: String(viewModel.settings.badge_text || "Oferta oficial"),
    ctaHref: resolveTemplateCtaHref(viewModel),
    ctaText: String(viewModel.presell.cta_text || "Continuar"),
    ctaTextWithArrow: resolveTemplateCtaText(viewModel.presell, { appendArrow: showArrows }),
    showArrows,
    trustBadges: splitMultilineValue(viewModel.settings.trust_badges, { limit: 3 })
  };
}

function buildOfferModalPresentation(viewModel) {
  const rating = String(viewModel.settings.rating || "");
  const starsText = String(viewModel.settings.stars_text || "");

  return {
    backgroundImageUrl: toMediaUrl(
      viewModel.presell.background_image_path || viewModel.presell.image_path || ""
    ),
    ctaHref: resolveTemplateCtaHref(viewModel),
    ctaText: resolveTemplateCtaText(viewModel.presell, {
      override: viewModel.settings.modal_cta_text_override
    }),
    discountText: String(viewModel.settings.discount_text || ""),
    overlayStrength: String(viewModel.settings.overlay_strength || 0.65),
    rating,
    ratingLabel: [rating, starsText].filter(Boolean).join(" ").trim(),
    scarcityText: String(viewModel.settings.scarcity_text || ""),
    starsText
  };
}

function buildDeviceFramePresentation(viewModel) {
  return {
    ctaHref: resolveTemplateCtaHref(viewModel),
    ctaText: String(viewModel.presell.cta_text || "Continuar"),
    footerLeftText: String(viewModel.settings.footer_left_text || ""),
    footerRightText: String(viewModel.settings.footer_right_text || ""),
    frameType: String(viewModel.settings.frame_type || "browser"),
    imageUrl: toMediaUrl(viewModel.presell.image_path || ""),
    offerNote: String(viewModel.settings.offer_note || ""),
    topBarText: String(viewModel.settings.top_bar_text || ""),
    visibleBullets: Array.isArray(viewModel.bullets)
      ? viewModel.bullets.slice(0, 3)
      : []
  };
}

function buildAppAdBasePresentation(viewModel) {
  const buttonStyle = String(viewModel.settings.button_style || "solid");

  return {
    backgroundImageUrl: toMediaUrl(viewModel.presell.background_image_path || ""),
    buttonClassName: `app-ad-cta app-ad-button-${buttonStyle}`,
    buttonStyle,
    ctaHref: resolveTemplateCtaHref(viewModel),
    ctaText: String(viewModel.presell.cta_text || "Continuar"),
    disclaimer: String(viewModel.settings.disclaimer || ""),
    imageUrl: toMediaUrl(viewModel.presell.image_path || ""),
    labelText: String(viewModel.settings.label_text || "Anuncio"),
    layoutDensity: String(viewModel.settings.layout_density || "comfortable"),
    microcopy: String(viewModel.settings.microcopy || "")
  };
}

function buildAppAdPresentation(viewModel) {
  return buildAppAdBasePresentation(viewModel);
}

function buildAppAdFullscreenPresentation(viewModel) {
  return buildAppAdBasePresentation(viewModel);
}

const templatePresentationBuilders = Object.freeze({
  advertorial: buildArticlePresentation,
  review: buildArticlePresentation,
  problem: buildArticlePresentation,
  quiz: buildArticlePresentation,
  "app-ad": buildAppAdPresentation,
  "app-ad-fullscreen": buildAppAdFullscreenPresentation,
  "device-frame": buildDeviceFramePresentation,
  "official-simple": buildOfficialSimplePresentation,
  "offer-modal": buildOfferModalPresentation
});

function buildTemplatePresentation(viewModel) {
  const builder = templatePresentationBuilders[viewModel.template.id];
  return builder ? builder(viewModel) : {};
}

module.exports = {
  buildTemplatePresentation,
  normalizeBoolean,
  resolveTemplateCtaHref,
  resolveTemplateCtaText,
  splitMultilineValue,
  toMediaUrl,
  buildArticlePresentation
};
