const { db } = require("../db/connection");
const {
  allowedTemplates,
  normalizeSettings,
  parseSettingsJson
} = require("./presellTemplates");

function listPresells() {
  return db
    .prepare("SELECT * FROM presells ORDER BY updated_at DESC, id DESC")
    .all();
}

function getPresellById(id) {
  return db.prepare("SELECT * FROM presells WHERE id = ?").get(id);
}

function getPresellBySlug(slug) {
  return db.prepare("SELECT * FROM presells WHERE slug = ?").get(slug);
}

function getPublishedPresell(slug) {
  return db
    .prepare("SELECT * FROM presells WHERE slug = ? AND status = 'published'")
    .get(slug);
}

function savePresell(input, imagePath) {
  const existingPresell = input.id ? getPresellById(input.id) : null;
  const data = normalizePresellInput(input, imagePath, existingPresell);

  if (input.id) {
    db.prepare(`
      UPDATE presells
      SET slug = ?, status = ?, template = ?, title = ?, headline = ?,
          subtitle = ?, body = ?, bullets = ?, cta_text = ?, affiliate_url = ?,
          image_path = ?, settings_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.slug,
      data.status,
      data.template,
      data.title,
      data.headline,
      data.subtitle,
      data.body,
      data.bullets,
      data.ctaText,
      data.affiliateUrl,
      data.imagePath,
      data.settingsJson,
      input.id
    );
    return getPresellById(input.id);
  }

  const result = db.prepare(`
    INSERT INTO presells (
      slug, status, template, title, headline, subtitle, body, bullets,
      cta_text, affiliate_url, image_path, settings_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.slug,
    data.status,
    data.template,
    data.title,
    data.headline,
    data.subtitle,
    data.body,
    data.bullets,
    data.ctaText,
    data.affiliateUrl,
    data.imagePath,
    data.settingsJson
  );

  return getPresellById(result.lastInsertRowid);
}

function duplicatePresell(id) {
  const source = getPresellById(id);
  if (!source) return null;

  const slug = buildDuplicateSlug(source.slug);
  const title = `${source.title} (copia)`;

  const result = db.prepare(`
    INSERT INTO presells (
      slug, status, template, title, headline, subtitle, body, bullets,
      cta_text, affiliate_url, image_path, settings_json
    ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug,
    source.template,
    title,
    source.headline,
    source.subtitle,
    source.body,
    source.bullets,
    source.cta_text,
    source.affiliate_url,
    source.image_path,
    source.settings_json || "{}"
  );

  return getPresellById(result.lastInsertRowid);
}

function deletePresell(id) {
  db.prepare("DELETE FROM presells WHERE id = ?").run(id);
}

function parseBullets(presell) {
  return String(presell.bullets || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePresellInput(input, imagePath, existingPresell = null) {
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
    imagePath: imagePath || input.current_image_path || "",
    settingsJson: JSON.stringify(settings)
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
