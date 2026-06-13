const { buildApiError } = require("../contracts/shared");
const {
  zodPresellV2WriteSchema,
  deserializePresellV2WriteInput,
  serializePresellV2Summary,
  serializePresellV2Detail
} = require("../contracts/presellsV2");
const {
  listPresellsV2,
  getPresellV2ById,
  createPresellV2,
  deletePresellV2,
  PresellV2SlugTakenError
} = require("../repositories/presellV2Repository");
const { renderSectionsToHtml } = require("../services/sectionsRenderer");

function respondNotFound(res, id) {
  return res.status(404).json(buildApiError(
    "presell_v2_not_found",
    `Presell V2 com id "${id}" não encontrado.`
  ));
}

function listV2(req, res) {
  const rows = listPresellsV2();
  return res.json({ items: rows.map(serializePresellV2Summary) });
}

function getV2(req, res) {
  const row = getPresellV2ById(req.params.id);
  if (!row) {
    return respondNotFound(res, req.params.id);
  }
  return res.json(serializePresellV2Detail(row));
}

function createV2(req, res) {
  const validation = zodPresellV2WriteSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json(buildApiError(
      "validation_error",
      "Dados inválidos.",
      { fields: validation.error.flatten() }
    ));
  }

  const input = deserializePresellV2WriteInput(req.body);
  const renderedHtml = renderSectionsToHtml(input.sections);

  try {
    const created = createPresellV2({
      slug: input.slug,
      affiliateUrl: input.affiliateUrl,
      sections: input.sections,
      renderedHtml
    });
    return res.status(201).json(serializePresellV2Detail(created));
  } catch (error) {
    if (error instanceof PresellV2SlugTakenError) {
      return res.status(409).json(buildApiError(
        "slug_taken",
        `Slug "${input.slug}" já está em uso.`,
        { slug: input.slug }
      ));
    }
    throw error;
  }
}

function removeV2(req, res) {
  const row = getPresellV2ById(req.params.id);
  if (!row) {
    return respondNotFound(res, req.params.id);
  }
  deletePresellV2(req.params.id);
  return res.status(204).end();
}

module.exports = {
  listV2,
  getV2,
  createV2,
  removeV2
};
