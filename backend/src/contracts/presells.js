const { z } = require("zod");
const { parsePresellSettings, allowedTemplates } = require("../services/presellTemplates");
const { parseBullets } = require("../services/presellService");
const {
  createPageInfo,
  decodeCursor,
  encodeCursor,
  getPageLimit,
  toInteger
} = require("./shared");
const { mediaReferenceSchema, serializeMediaReference } = require("./uploads");
const { normalizeMediaPath, buildMediaUrl } = require("../services/mediaPathService");

const presellStatusValues = ["draft", "published"];

// Base shape — all fields optional; used to derive Write and Patch schemas
const zodPresellBaseSchema = z.object({
  slug: z.string().min(1, "slug é obrigatório").optional(),
  affiliate_url: z.string().url("affiliate_url deve ser uma URL válida").optional(),
  affiliateUrl: z.string().url("affiliateUrl deve ser uma URL válida").optional(),
  template: z.string().optional(),
  templateId: z.string().optional(),
  status: z.enum(presellStatusValues).optional(),
  title: z.string().optional(),
  headline: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  bullets: z.union([z.string(), z.array(z.string())]).optional(),
  legalText: z.string().optional(),
  legal_text: z.string().optional(),
  ctaText: z.string().optional(),
  cta_text: z.string().optional(),
  google_pixel: z.string().max(50, "google_pixel deve ter no máximo 50 caracteres").nullable().optional(),
  googlePixelId: z.string().max(50, "googlePixelId deve ter no máximo 50 caracteres").nullable().optional(),
  tracking_param: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/, "tracking_param inválido. Use apenas letras, números, _ ou - (máx 50 chars, início com letra)").optional(),
  trackingParam: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/, "trackingParam inválido. Use apenas letras, números, _ ou - (máx 50 chars, início com letra)").optional(),
  settings: z.object({}).passthrough().optional(),
  theme: z.any().optional(),
  galleryImages: z.array(z.any()).optional(),
  media: z.object({
    heroImage: z.any().optional(),
    backgroundImage: z.any().optional()
  }).optional(),
  current_image_path: z.string().optional(),
  current_background_image_path: z.string().optional(),
  id: z.number().optional()
});

const zodPresellWriteSchema = zodPresellBaseSchema
  .extend({ slug: z.string().min(1, "slug é obrigatório") })
  .refine(
    (data) => data.affiliate_url || data.affiliateUrl,
    { message: "affiliate_url ou affiliateUrl é obrigatório", path: ["affiliate_url"] }
  )
  .refine(
    (data) => {
      const template = data.template || data.templateId || "advertorial";
      return allowedTemplates.includes(template);
    },
    { message: "template inválido", path: ["template"] }
  );

// Patch schema — all fields optional; template refine skips when omitted
const zodPresellPatchSchema = zodPresellBaseSchema
  .refine(
    (data) => {
      const template = data.template || data.templateId;
      return !template || allowedTemplates.includes(template);
    },
    { message: "template inválido", path: ["template"] }
  );

const presellWriteSchema = {
  type: "object",
  required: ["slug", "templateId", "affiliateUrl"],
  properties: {
    slug: { type: "string" },
    status: { type: "string", enum: presellStatusValues },
    templateId: { type: "string" },
    title: { type: "string" },
    headline: { type: "string" },
    subtitle: { type: "string" },
    body: { type: "string" },
    bullets: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } }
      ]
    },
    legalText: { type: "string" },
    ctaText: { type: "string" },
    affiliateUrl: { type: "string" },
    googlePixelId: { type: ["string", "null"] },
    trackingParam: { type: "string" },
    settings: {
      type: "object",
      additionalProperties: true
    },
    media: {
      type: "object",
      properties: {
        heroImage: mediaReferenceSchema,
        backgroundImage: mediaReferenceSchema
      }
    }
  }
};

const presellPatchSchema = {
  type: "object",
  properties: presellWriteSchema.properties
};

const presellSummarySchema = {
  type: "object",
  required: [
    "id",
    "slug",
    "status",
    "templateId",
    "title",
    "headline",
    "ctaText",
    "affiliateUrl",
    "media",
    "tracking",
    "timestamps"
  ],
  properties: {
    id: { type: "number" },
    slug: { type: "string" },
    status: { type: "string", enum: presellStatusValues },
    templateId: { type: "string" },
    title: { type: "string" },
    headline: { type: "string" },
    subtitle: { type: "string" },
    ctaText: { type: "string" },
    affiliateUrl: { type: "string" },
    published: { type: "boolean" },
    media: {
      type: "object",
      properties: {
        heroImage: mediaReferenceSchema,
        backgroundImage: mediaReferenceSchema
      }
    },
    tracking: {
      type: "object",
      properties: {
        googlePixelId: { type: ["string", "null"] },
        trackingParam: { type: "string" }
      }
    },
    timestamps: {
      type: "object",
      properties: {
        createdAt: { type: ["string", "null"] },
        updatedAt: { type: ["string", "null"] }
      }
    }
  }
};

const presellDetailSchema = {
  ...presellSummarySchema,
  properties: {
    ...presellSummarySchema.properties,
    body: { type: "string" },
    bullets: { type: "array", items: { type: "string" } },
    settings: {
      type: "object",
      additionalProperties: true
    },
    urls: {
      type: "object",
      properties: {
        publicPage: { type: "string" },
        redirect: { type: "string" }
      }
    }
  }
};

const presellListResponseSchema = {
  type: "object",
  required: ["items", "pageInfo"],
  properties: {
    items: {
      type: "array",
      items: presellSummarySchema
    },
    pageInfo: {
      type: "object",
      properties: {
        limit: { type: "number" },
        nextCursor: { type: ["string", "null"] },
        hasMore: { type: "boolean" }
      }
    }
  }
};

function serializePresellSummary(presell) {
  return {
    id: Number(presell.id),
    slug: String(presell.slug || ""),
    status: presell.status === "published" ? "published" : "draft",
    templateId: String(presell.template || "advertorial"),
    title: String(presell.title || ""),
    headline: String(presell.headline || ""),
    subtitle: String(presell.subtitle || ""),
    ctaText: String(presell.cta_text || ""),
    affiliateUrl: String(presell.affiliate_url || ""),
    published: presell.status === "published",
    media: {
      heroImage: serializeMediaReference(presell.image_path),
      backgroundImage: serializeMediaReference(presell.background_image_path)
    },
    tracking: {
      googlePixelId: presell.google_pixel || null,
      trackingParam: String(presell.tracking_param || "gclid")
    },
    timestamps: {
      createdAt: presell.created_at || null,
      updatedAt: presell.updated_at || null
    },
    theme: presell.theme ? JSON.parse(presell.theme) : null,
    galleryImages: presell.gallery_images ? JSON.parse(presell.gallery_images) : []
  };
}

function serializePresellDetail(presell) {
  return {
    ...serializePresellSummary(presell),
    body: String(presell.body || ""),
    bullets: parseBullets(presell),
    legalText: String(presell.legal_text || ""),
    settings: parsePresellSettings(presell),
    urls: {
      publicPage: `/p/${encodeURIComponent(presell.slug || "")}`,
      redirect: `/go/${encodeURIComponent(presell.slug || "")}`
    }
  };
}

function serializePresellWriteInput(presell) {
  return {
    id: Number(presell.id),
    slug: String(presell.slug || ""),
    status: presell.status === "published" ? "published" : "draft",
    templateId: String(presell.template || "advertorial"),
    title: String(presell.title || ""),
    headline: String(presell.headline || ""),
    subtitle: String(presell.subtitle || ""),
    body: String(presell.body || ""),
    bullets: parseBullets(presell),
    legalText: String(presell.legal_text || ""),
    ctaText: String(presell.cta_text || ""),
    affiliateUrl: String(presell.affiliate_url || ""),
    googlePixelId: presell.google_pixel || null,
    trackingParam: String(presell.tracking_param || "gclid"),
    settings: parsePresellSettings(presell),
    media: {
      heroImage: serializeMediaReference(presell.image_path),
      backgroundImage: serializeMediaReference(presell.background_image_path)
    }
  };
}

function deserializePresellWriteInput(payload = {}) {
  const media = payload.media && typeof payload.media === "object" ? payload.media : {};
  const hasHeroImage = Object.prototype.hasOwnProperty.call(media, "heroImage");
  const hasBackgroundImage = Object.prototype.hasOwnProperty.call(media, "backgroundImage");
  const bullets = Array.isArray(payload.bullets)
    ? payload.bullets.join("\n")
    : String(payload.bullets || payload.bullets_text || "").trim();

  return {
    id: toInteger(payload.id, undefined),
    slug: String(payload.slug || "").trim(),
    status: payload.status === "published" ? "published" : "draft",
    template: String(payload.templateId || payload.template || "advertorial"),
    title: String(payload.title || "").trim(),
    headline: String(payload.headline || "").trim(),
    subtitle: String(payload.subtitle || "").trim(),
    body: String(payload.body || "").trim(),
    bullets,
    legal_text: String(payload.legalText || payload.legal_text || "").trim(),
    cta_text: String(payload.ctaText || payload.cta_text || "").trim(),
    affiliate_url: String(payload.affiliateUrl || payload.affiliate_url || "").trim(),
    google_pixel: payload.googlePixelId || payload.google_pixel || null,
    tracking_param: String(payload.trackingParam || payload.tracking_param || "gclid").trim() || "gclid",
    settings: payload.settings && typeof payload.settings === "object" ? payload.settings : {},
    current_image_path: hasHeroImage
      ? readMediaReferencePath(media.heroImage)
      : normalizeMediaPath(String(payload.current_image_path || "")),
    current_background_image_path: hasBackgroundImage
      ? readMediaReferencePath(media.backgroundImage)
      : normalizeMediaPath(String(payload.current_background_image_path || "")),
    remove_image: hasHeroImage && media.heroImage === null,
    remove_background_image: hasBackgroundImage && media.backgroundImage === null,
    theme: payload.theme != null ? JSON.stringify(payload.theme) : null,
    gallery_images: Array.isArray(payload.galleryImages) ? JSON.stringify(payload.galleryImages) : "[]"
  };
}

function readMediaReferencePath(reference) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    return "";
  }

  return normalizeMediaPath(
    reference.fileName
    || reference.path
    || reference.url
    || ""
  );
}

function deserializePresellListQuery(query = {}) {
  const rawCursor = decodeCursor(query.cursor);
  const cursorId = toInteger(rawCursor && rawCursor.id, null);
  const templateId = String(query.templateId || "").trim();

  return {
    limit: getPageLimit(query.limit),
    status: presellStatusValues.includes(query.status) ? query.status : null,
    templateId: templateId || null,
    cursor: rawCursor && rawCursor.updatedAt && Number.isInteger(cursorId)
      ? {
        updatedAt: String(rawCursor.updatedAt),
        id: cursorId
      }
      : null
  };
}

function serializePresellListResponse(result = {}) {
  const items = Array.isArray(result.items) ? result.items : [];
  const limit = getPageLimit(result.limit);
  const hasMore = Boolean(result.hasMore);
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem
    ? encodeCursor({
      updatedAt: lastItem.updated_at || null,
      id: Number(lastItem.id)
    })
    : null;

  return {
    items: items.map(serializePresellSummary),
    pageInfo: createPageInfo({ limit, nextCursor, hasMore })
  };
}

const publicPresellSchema = {
  type: "object",
  required: ["id", "slug", "templateId", "headline", "ctaText", "affiliateUrl"],
  properties: {
    id: { type: "number" },
    slug: { type: "string" },
    templateId: { type: "string" },
    headline: { type: "string" },
    subtitle: { type: "string" },
    body: { type: "string" },
    bullets: { type: "array", items: { type: "string" } },
    ctaText: { type: "string" },
    affiliateUrl: { type: "string" },
    googlePixelId: { type: ["string", "null"] },
    trackingParam: { type: "string" },
    imageUrl: { type: ["string", "null"] },
    backgroundImageUrl: { type: ["string", "null"] },
    settings: { type: "object", additionalProperties: true }
  }
};

function serializePublicPresell(presell) {
  return {
    id: Number(presell.id),
    slug: String(presell.slug || ""),
    templateId: String(presell.template || "advertorial"),
    headline: String(presell.headline || ""),
    subtitle: String(presell.subtitle || ""),
    body: String(presell.body || ""),
    bullets: parseBullets(presell),
    ctaText: String(presell.cta_text || ""),
    affiliateUrl: String(presell.affiliate_url || ""),
    googlePixelId: presell.google_pixel || null,
    trackingParam: String(presell.tracking_param || "gclid"),
    imageUrl: buildMediaUrl(presell.image_path) || null,
    backgroundImageUrl: buildMediaUrl(presell.background_image_path) || null,
    settings: parsePresellSettings(presell),
    theme: presell.theme ? JSON.parse(presell.theme) : null,
    galleryImages: presell.gallery_images ? JSON.parse(presell.gallery_images) : []
  };
}

module.exports = {
  presellStatusValues,
  presellWriteSchema,
  presellPatchSchema,
  presellSummarySchema,
  presellDetailSchema,
  presellListResponseSchema,
  publicPresellSchema,
  zodPresellWriteSchema,
  zodPresellPatchSchema,
  serializePresellSummary,
  serializePresellDetail,
  serializePresellWriteInput,
  deserializePresellWriteInput,
  deserializePresellListQuery,
  serializePresellListResponse,
  serializePublicPresell
};
