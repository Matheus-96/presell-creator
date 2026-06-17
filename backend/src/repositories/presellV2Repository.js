const { db } = require("../db/connection");

const listStmt = db.prepare(`
  SELECT id, slug, created_at
  FROM presells_v2
  ORDER BY created_at DESC, id DESC
`);
const getByIdStmt = db.prepare("SELECT * FROM presells_v2 WHERE id = ?");
const getBySlugStmt = db.prepare("SELECT * FROM presells_v2 WHERE slug = ?");
const insertStmt = db.prepare(`
  INSERT INTO presells_v2 (slug, affiliate_url, sections_json, rendered_html)
  VALUES (?, ?, ?, ?)
`);
const updateStmt = db.prepare(`
  UPDATE presells_v2
  SET affiliate_url = ?, sections_json = ?, rendered_html = ?, updated_at = datetime('now')
  WHERE id = ?
`);
const deleteStmt = db.prepare("DELETE FROM presells_v2 WHERE id = ?");

const SLUG_UNIQUE_ERROR = "presell_v2_slug_taken";

class PresellV2SlugTakenError extends Error {
  constructor(slug) {
    super(`Slug "${slug}" já está em uso.`);
    this.code = SLUG_UNIQUE_ERROR;
    this.slug = slug;
  }
}

function listPresellsV2() {
  return listStmt.all();
}

function getPresellV2ById(id) {
  return getByIdStmt.get(id);
}

function getPresellV2BySlug(slug) {
  return getBySlugStmt.get(slug);
}

function createPresellV2({ slug, affiliateUrl, sections, renderedHtml = null }) {
  const sectionsJson = JSON.stringify(sections);

  try {
    const result = insertStmt.run(slug, affiliateUrl, sectionsJson, renderedHtml);
    return getPresellV2ById(result.lastInsertRowid);
  } catch (error) {
    if (isUniqueSlugError(error)) {
      throw new PresellV2SlugTakenError(slug);
    }
    throw error;
  }
}

function updatePresellV2({ id, affiliateUrl, sections, renderedHtml = null }) {
  const sectionsJson = JSON.stringify(sections);
  updateStmt.run(affiliateUrl, sectionsJson, renderedHtml, id);
  return getPresellV2ById(id);
}

function deletePresellV2(id) {
  deleteStmt.run(id);
}

// node:sqlite uses errcode 2067 (SQLITE_CONSTRAINT_UNIQUE)
function isUniqueSlugError(error) {
  if (!error) return false;
  if (error.errcode === 2067) return true;
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return true;
  return false;
}

module.exports = {
  listPresellsV2,
  getPresellV2ById,
  getPresellV2BySlug,
  createPresellV2,
  updatePresellV2,
  deletePresellV2,
  PresellV2SlugTakenError
};
