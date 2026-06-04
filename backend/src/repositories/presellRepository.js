const { db } = require("../db/connection");

const presellSummarySelect = `
  id,
  slug,
  status,
  template,
  title,
  headline,
  subtitle,
  cta_text,
  affiliate_url,
  image_path,
  google_pixel,
  background_image_path,
  tracking_param,
  theme,
  gallery_images,
  created_at,
  updated_at
`;

const listPresellsStmt = db.prepare(`
  SELECT ${presellSummarySelect}
  FROM presells
  ORDER BY updated_at DESC, id DESC
`);
const listPresellCollectionStmt = db.prepare(`
  SELECT ${presellSummarySelect}
  FROM presells
  WHERE (? IS NULL OR status = ?)
    AND (? IS NULL OR template = ?)
    AND (
      ? IS NULL
      OR updated_at < ?
      OR (updated_at = ? AND id < ?)
    )
  ORDER BY updated_at DESC, id DESC
  LIMIT ?
`);
const getPresellByIdStmt = db.prepare("SELECT * FROM presells WHERE id = ?");
const getPresellBySlugStmt = db.prepare("SELECT * FROM presells WHERE slug = ?");
const getPublishedPresellStmt = db.prepare(
  "SELECT * FROM presells WHERE slug = ? AND status = 'published'"
);
const listDuplicateSlugsStmt = db.prepare(
  "SELECT slug FROM presells WHERE slug = ? OR slug LIKE ?"
);
const updatePresellStmt = db.prepare(`
  UPDATE presells
  SET slug = ?, status = ?, template = ?, title = ?, headline = ?,
      subtitle = ?, body = ?, bullets = ?, legal_text = ?, cta_text = ?, affiliate_url = ?,
      image_path = ?, settings_json = ?, google_pixel = ?, background_image_path = ?,
      tracking_param = ?, theme = ?, gallery_images = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const createPresellStmt = db.prepare(`
  INSERT INTO presells (
    slug, status, template, title, headline, subtitle, body, bullets,
    legal_text, cta_text, affiliate_url, image_path, settings_json, google_pixel, background_image_path, tracking_param, theme, gallery_images
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const duplicatePresellStmt = db.prepare(`
  INSERT INTO presells (
    slug, status, template, title, headline, subtitle, body, bullets,
    cta_text, affiliate_url, image_path, settings_json, google_pixel, tracking_param
  ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const deletePresellStmt = db.prepare("DELETE FROM presells WHERE id = ?");
const getSlugsByImagePathStmt = db.prepare(
  "SELECT slug FROM presells WHERE image_path LIKE ? OR background_image_path LIKE ?"
);

function listPresells() {
  return listPresellsStmt.all();
}

function listPresellCollection({
  status = null,
  templateId = null,
  cursor = null,
  limit = 20
} = {}) {
  const cursorUpdatedAt = cursor && cursor.updatedAt ? String(cursor.updatedAt) : null;
  const cursorId = cursor && Number.isInteger(cursor.id) ? cursor.id : null;
  const rows = listPresellCollectionStmt.all(
    status,
    status,
    templateId,
    templateId,
    cursorUpdatedAt,
    cursorUpdatedAt,
    cursorUpdatedAt,
    cursorId,
    limit + 1
  );
  const hasMore = rows.length > limit;

  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    hasMore,
    limit
  };
}

function getPresellById(id) {
  return getPresellByIdStmt.get(id);
}

function getPresellBySlug(slug) {
  return getPresellBySlugStmt.get(slug);
}

function getPublishedPresell(slug) {
  return getPublishedPresellStmt.get(slug);
}

function updatePresell(id, data) {
  updatePresellStmt.run(
    data.slug,
    data.status,
    data.template,
    data.title,
    data.headline,
    data.subtitle,
    data.body,
    data.bullets,
    data.legalText ?? "",
    data.ctaText,
    data.affiliateUrl,
    data.imagePath,
    data.settingsJson,
    data.googlePixel,
    data.backgroundImagePath,
    data.trackingParam ?? "gclid",
    data.theme ?? null,
    data.galleryImages ?? "[]",
    id
  );

  return getPresellById(id);
}

function createPresell(data) {
  const result = createPresellStmt.run(
    data.slug,
    data.status,
    data.template,
    data.title,
    data.headline,
    data.subtitle,
    data.body,
    data.bullets,
    data.legalText ?? "",
    data.ctaText,
    data.affiliateUrl,
    data.imagePath,
    data.settingsJson,
    data.googlePixel,
    data.backgroundImagePath,
    data.trackingParam ?? "gclid",
    data.theme ?? null,
    data.galleryImages ?? "[]"
  );

  return getPresellById(result.lastInsertRowid);
}

function duplicatePresell(source, { slug, title }) {
  const result = duplicatePresellStmt.run(
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
    source.settings_json || "{}",
    source.google_pixel || null,
    source.tracking_param || "gclid"
  );

  return getPresellById(result.lastInsertRowid);
}

function listDuplicateSlugs(baseSlug) {
  return listDuplicateSlugsStmt
    .all(baseSlug, `${baseSlug}-%`)
    .map((row) => String(row.slug || ""));
}

function deletePresell(id) {
  deletePresellStmt.run(id);
}

function getSlugsByImagePath(filename) {
  const pattern = `%${filename}%`;
  return getSlugsByImagePathStmt.all(pattern, pattern).map((row) => String(row.slug));
}

module.exports = {
  listPresells,
  listPresellCollection,
  getPresellById,
  getPresellBySlug,
  getPublishedPresell,
  updatePresell,
  createPresell,
  duplicatePresell,
  listDuplicateSlugs,
  deletePresell,
  getSlugsByImagePath
};
