const { z } = require("zod");

const sectionTypes = ["hero", "faq", "testimonials", "footer"];

const zodSectionSchema = z.object({
  type: z.enum(sectionTypes),
  order: z.number().int().min(0),
  props: z.object({}).passthrough()
});

const zodPresellV2UpdateSchema = z.object({
  sections: z.array(zodSectionSchema).min(1, "sections é obrigatório")
});

const zodPresellV2WriteSchema = z.object({
  slug: z.string().min(1, "slug é obrigatório"),
  affiliate_url: z.string().url("affiliate_url deve ser uma URL válida").optional(),
  affiliateUrl: z.string().url("affiliateUrl deve ser uma URL válida").optional(),
  sections_json: z.array(zodSectionSchema).optional(),
  sectionsJson: z.array(zodSectionSchema).optional(),
  sections: z.array(zodSectionSchema).optional()
})
  .refine(
    (data) => data.affiliate_url || data.affiliateUrl,
    { message: "affiliate_url é obrigatório", path: ["affiliate_url"] }
  )
  .refine(
    (data) => data.sections_json || data.sectionsJson || data.sections,
    { message: "sections_json é obrigatório", path: ["sections_json"] }
  );

function deserializePresellV2WriteInput(payload = {}) {
  const affiliateUrl = payload.affiliateUrl ?? payload.affiliate_url;
  const sections = payload.sections_json ?? payload.sectionsJson ?? payload.sections;
  return {
    slug: String(payload.slug || "").trim(),
    affiliateUrl: String(affiliateUrl || "").trim(),
    sections: Array.isArray(sections) ? sections : []
  };
}

function parseSections(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializePresellV2Summary(row) {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    createdAt: row.created_at
  };
}

function serializePresellV2Detail(row) {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    affiliateUrl: String(row.affiliate_url),
    sections: parseSections(row.sections_json),
    renderedHtml: row.rendered_html ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  sectionTypes,
  zodSectionSchema,
  zodPresellV2WriteSchema,
  zodPresellV2UpdateSchema,
  deserializePresellV2WriteInput,
  parseSections,
  serializePresellV2Summary,
  serializePresellV2Detail
};
