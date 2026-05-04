const { db } = require("../db/connection");

const listPresellsStmt = db.prepare(
  "SELECT * FROM presells ORDER BY updated_at DESC, id DESC"
);
const getPresellByIdStmt = db.prepare("SELECT * FROM presells WHERE id = ?");
const getPresellBySlugStmt = db.prepare("SELECT * FROM presells WHERE slug = ?");
const getPublishedPresellStmt = db.prepare(
  "SELECT * FROM presells WHERE slug = ? AND status = 'published'"
);
const updatePresellStmt = db.prepare(`
  UPDATE presells
  SET slug = ?, status = ?, template = ?, title = ?, headline = ?,
      subtitle = ?, body = ?, bullets = ?, cta_text = ?, affiliate_url = ?,
      image_path = ?, settings_json = ?, google_pixel = ?, background_image_path = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const createPresellStmt = db.prepare(`
  INSERT INTO presells (
    slug, status, template, title, headline, subtitle, body, bullets,
    cta_text, affiliate_url, image_path, settings_json, google_pixel, background_image_path
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const duplicatePresellStmt = db.prepare(`
  INSERT INTO presells (
    slug, status, template, title, headline, subtitle, body, bullets,
    cta_text, affiliate_url, image_path, settings_json, google_pixel
  ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const deletePresellStmt = db.prepare("DELETE FROM presells WHERE id = ?");

function listPresells() {
  return listPresellsStmt.all();
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
    data.ctaText,
    data.affiliateUrl,
    data.imagePath,
    data.settingsJson,
    data.googlePixel,
    data.backgroundImagePath,
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
    data.ctaText,
    data.affiliateUrl,
    data.imagePath,
    data.settingsJson,
    data.googlePixel,
    data.backgroundImagePath
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
    source.google_pixel || null
  );

  return getPresellById(result.lastInsertRowid);
}

function deletePresell(id) {
  deletePresellStmt.run(id);
}

module.exports = {
  listPresells,
  getPresellById,
  getPresellBySlug,
  getPublishedPresell,
  updatePresell,
  createPresell,
  duplicatePresell,
  deletePresell
};
