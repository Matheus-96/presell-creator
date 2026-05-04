const {
  allowedTemplates,
  normalizeSettings,
  parseSettingsJson
} = require("./presellTemplates");
const { deleteUpload } = require("./uploadService");
const presellRepository = require("../repositories/presellRepository");

function listPresells() {
  return presellRepository.listPresells();
}

function getPresellById(id) {
  return presellRepository.getPresellById(id);
}

function getPresellBySlug(slug) {
  return presellRepository.getPresellBySlug(slug);
}

function getPublishedPresell(slug) {
  return presellRepository.getPublishedPresell(slug);
}

function savePresell(input, imagePath, backgroundImagePath) {
  const existingPresell = input.id ? getPresellById(input.id) : null;

  // Delete old images if removing
  if (imagePath === null && existingPresell && existingPresell.image_path) {
    deleteUpload(existingPresell.image_path);
  }
  if (backgroundImagePath === null && existingPresell && existingPresell.background_image_path) {
    deleteUpload(existingPresell.background_image_path);
  }

  const data = normalizePresellInput(input, imagePath, backgroundImagePath, existingPresell);

  if (input.id) {
    return presellRepository.updatePresell(input.id, data);
  }

  return presellRepository.createPresell(data);
}

function duplicatePresell(id) {
  const source = getPresellById(id);
  if (!source) return null;

  const slug = buildDuplicateSlug(source.slug);
  const title = `${source.title} (copia)`;

  return presellRepository.duplicatePresell(source, { slug, title });
}

function deletePresell(id) {
  presellRepository.deletePresell(id);
}

function parseBullets(presell) {
  return String(presell.bullets || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePresellInput(input, imagePath, backgroundImagePath, existingPresell = null) {
  const slug = String(input.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) throw new Error("Slug obrigatorio.");

  const template = allowedTemplates.includes(input.template)
    ? input.template
    : "advertorial";
  const status = input.status === "published" ? "published" : "draft";
  const affiliateUrl = String(input.affiliate_url || "").trim();

  try {
    new URL(affiliateUrl);
  } catch {
    throw new Error("Link afiliado invalido.");
  }

  const existingSettings = existingPresell
    ? parseSettingsJson(existingPresell.settings_json)
    : {};
  const settings = normalizeSettings(
    template,
    input.settings || {},
    existingSettings
  );

  const googlePixel = String(input.google_pixel || "").trim();
  if (googlePixel && googlePixel.length > 50) {
    throw new Error("Google Pixel ID deve ter no maximo 50 caracteres.");
  }

  return {
    slug,
    status,
    template,
    title: String(input.title || input.headline || "Presell").trim(),
    headline: String(input.headline || "Descubra a recomendacao").trim(),
    subtitle: String(input.subtitle || "").trim(),
    body: String(input.body || "").trim(),
    bullets: String(input.bullets || "").trim(),
    ctaText: String(input.cta_text || "Continuar").trim(),
    affiliateUrl,
    imagePath: imagePath === null ? null : (imagePath !== undefined ? imagePath : (input.current_image_path || "")),
    backgroundImagePath: backgroundImagePath === null ? null : (backgroundImagePath !== undefined ? backgroundImagePath : (input.current_background_image_path || "")),
    settingsJson: JSON.stringify(settings),
    googlePixel: googlePixel || null
  };
}

function buildDuplicateSlug(slug) {
  const baseSlug = `${String(slug || "presell").replace(/-copia-\d+$|-copia$/, "")}-copia`;
  let candidate = baseSlug;
  let index = 2;

  while (getPresellBySlug(candidate)) {
    candidate = `${baseSlug}-${index}`;
    index += 1;
  }

  return candidate;
}

module.exports = {
  allowedTemplates,
  listPresells,
  getPresellById,
  getPresellBySlug,
  getPublishedPresell,
  savePresell,
  duplicatePresell,
  deletePresell,
  parseBullets
};
