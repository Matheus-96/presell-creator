/**
 * Tests for presells contract — theme field serialization/deserialization.
 * TDD: written before implementation.
 */

// Mock DB dependencies so contract functions can be imported without a real DB
jest.mock("../db/connection", () => ({
  db: {
    prepare: () => ({ get: jest.fn(), all: jest.fn(), run: jest.fn() }),
    exec: jest.fn(),
  },
}));
jest.mock("../services/presellTemplates", () => ({
  parsePresellSettings: jest.fn(() => ({})),
}));
jest.mock("../services/presellService", () => ({
  parseBullets: jest.fn(() => []),
}));
jest.mock("../services/mediaPathService", () => ({
  normalizeMediaPath: jest.fn((p) => p || ""),
  buildMediaUrl: jest.fn(() => null),
}));

const {
  serializePresellSummary,
  serializePresellDetail,
  deserializePresellWriteInput,
  serializePublicPresell,
} = require("../contracts/presells");

// ── serializePresellSummary ───────────────────────────────────────────────────

describe("serializePresellSummary — theme", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    status: "draft",
    template: "advertorial",
    title: "T",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns theme=null when row.theme is null", () => {
    const result = serializePresellSummary({ ...baseRow, theme: null });
    expect(result.theme).toBeNull();
  });

  test("returns theme=null when row.theme is undefined", () => {
    const result = serializePresellSummary({ ...baseRow });
    expect(result.theme).toBeNull();
  });

  test("parses JSON theme from row", () => {
    const theme = { primary: "#ff0000", secondary: "#00ff00" };
    const result = serializePresellSummary({ ...baseRow, theme: JSON.stringify(theme) });
    expect(result.theme).toEqual(theme);
  });
});

// ── serializePresellSummary — galleryImages ───────────────────────────────────

describe("serializePresellSummary — galleryImages", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    status: "draft",
    template: "advertorial",
    title: "T",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns galleryImages=[] when row.gallery_images is null", () => {
    const result = serializePresellSummary({ ...baseRow, gallery_images: null });
    expect(result.galleryImages).toEqual([]);
  });

  test("returns galleryImages=[] when row.gallery_images is undefined", () => {
    const result = serializePresellSummary({ ...baseRow });
    expect(result.galleryImages).toEqual([]);
  });

  test("returns parsed array when row.gallery_images is a JSON string", () => {
    const result = serializePresellSummary({ ...baseRow, gallery_images: '["a.jpg","b.jpg"]' });
    expect(result.galleryImages).toEqual(["a.jpg", "b.jpg"]);
  });
});

// ── serializePresellDetail ────────────────────────────────────────────────────

describe("serializePresellDetail — theme", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    status: "draft",
    template: "advertorial",
    title: "T",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns theme=null when row.theme is null", () => {
    const result = serializePresellDetail({ ...baseRow, theme: null });
    expect(result.theme).toBeNull();
  });

  test("parses full theme object from row", () => {
    const theme = {
      primary: "#111",
      secondary: "#222",
      background: "#333",
      surface: "#444",
      textColor: "#555",
    };
    const result = serializePresellDetail({ ...baseRow, theme: JSON.stringify(theme) });
    expect(result.theme).toEqual(theme);
  });
});

// ── serializePresellDetail — galleryImages ────────────────────────────────────

describe("serializePresellDetail — galleryImages", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    status: "draft",
    template: "advertorial",
    title: "T",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns galleryImages=[] when row.gallery_images is null", () => {
    const result = serializePresellDetail({ ...baseRow, gallery_images: null });
    expect(result.galleryImages).toEqual([]);
  });

  test("returns galleryImages=[] when row.gallery_images is undefined", () => {
    const result = serializePresellDetail({ ...baseRow });
    expect(result.galleryImages).toEqual([]);
  });

  test("returns parsed array when row.gallery_images is a JSON string", () => {
    const result = serializePresellDetail({ ...baseRow, gallery_images: '["a.jpg","b.jpg"]' });
    expect(result.galleryImages).toEqual(["a.jpg", "b.jpg"]);
  });
});

// ── serializePublicPresell ────────────────────────────────────────────────────

describe("serializePublicPresell — theme", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    template: "advertorial",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns theme=null when row.theme is null", () => {
    const result = serializePublicPresell({ ...baseRow, theme: null });
    expect(result.theme).toBeNull();
  });

  test("parses JSON theme for public presell", () => {
    const theme = { primary: "#abc" };
    const result = serializePublicPresell({ ...baseRow, theme: JSON.stringify(theme) });
    expect(result.theme).toEqual(theme);
  });
});

// ── serializePublicPresell — galleryImages ────────────────────────────────────

describe("serializePublicPresell — galleryImages", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    template: "advertorial",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns galleryImages=[] when row.gallery_images is null", () => {
    const result = serializePublicPresell({ ...baseRow, gallery_images: null });
    expect(result.galleryImages).toEqual([]);
  });

  test("returns galleryImages=[] when row.gallery_images is undefined", () => {
    const result = serializePublicPresell({ ...baseRow });
    expect(result.galleryImages).toEqual([]);
  });

  test("returns parsed array when row.gallery_images is a JSON string", () => {
    const result = serializePublicPresell({ ...baseRow, gallery_images: '["a.jpg","b.jpg"]' });
    expect(result.galleryImages).toEqual(["a.jpg", "b.jpg"]);
  });
});

// ── deserializePresellWriteInput ──────────────────────────────────────────────

// ── deserializePresellWriteInput — galleryImages ──────────────────────────────

describe("deserializePresellWriteInput — galleryImages", () => {
  const basePayload = {
    slug: "test",
    templateId: "advertorial",
    affiliateUrl: "https://example.com",
  };

  test("stores gallery_images as JSON string when array provided", () => {
    const result = deserializePresellWriteInput({ ...basePayload, galleryImages: ["a.jpg", "b.jpg"] });
    expect(result.gallery_images).toBe('["a.jpg","b.jpg"]');
  });

  test("stores gallery_images as '[]' when galleryImages is omitted", () => {
    const result = deserializePresellWriteInput({ ...basePayload });
    expect(result.gallery_images).toBe("[]");
  });

  test("stores gallery_images as '[]' when galleryImages is null", () => {
    const result = deserializePresellWriteInput({ ...basePayload, galleryImages: null });
    expect(result.gallery_images).toBe("[]");
  });
});

describe("deserializePresellWriteInput — theme", () => {
  const basePayload = {
    slug: "test",
    templateId: "advertorial",
    affiliateUrl: "https://example.com",
  };

  test("stores theme as JSON string when object provided", () => {
    const theme = { primary: "#ff0000" };
    const result = deserializePresellWriteInput({ ...basePayload, theme });
    expect(result.theme).toBe(JSON.stringify(theme));
  });

  test("stores null when theme is null", () => {
    const result = deserializePresellWriteInput({ ...basePayload, theme: null });
    expect(result.theme).toBeNull();
  });

  test("stores null when theme is omitted", () => {
    const result = deserializePresellWriteInput({ ...basePayload });
    expect(result.theme).toBeNull();
  });

  test("roundtrip: serialize then deserialize preserves theme", () => {
    const theme = { primary: "#red", background: "#blue" };
    const deserialized = deserializePresellWriteInput({ ...basePayload, theme });
    const row = {
      id: 1,
      slug: "test",
      status: "draft",
      template: "advertorial",
      title: "",
      headline: "",
      cta_text: "CTA",
      affiliate_url: "https://example.com",
      theme: deserialized.theme,
    };
    const serialized = serializePresellSummary(row);
    expect(serialized.theme).toEqual(theme);
  });
});

// ── serializePublicPresell — Google Ads labels ────────────────────────────────

describe("serializePublicPresell — Google Ads labels", () => {
  const baseRow = {
    id: 1,
    slug: "test",
    template: "advertorial",
    headline: "H",
    cta_text: "CTA",
    affiliate_url: "https://example.com",
  };

  test("returns googleAdsCTALabel=null when column is null", () => {
    const result = serializePublicPresell({ ...baseRow, google_ads_cta_label: null });
    expect(result.googleAdsCTALabel).toBeNull();
  });

  test("returns googleAdsCTALabel=null when column is omitted", () => {
    const result = serializePublicPresell({ ...baseRow });
    expect(result.googleAdsCTALabel).toBeNull();
  });

  test("returns googleAdsCTALabel when column has value", () => {
    const result = serializePublicPresell({ ...baseRow, google_ads_cta_label: "AbCdEf" });
    expect(result.googleAdsCTALabel).toBe("AbCdEf");
  });

  test("returns googleAdsPageviewLabel=null when column is null", () => {
    const result = serializePublicPresell({ ...baseRow, google_ads_pageview_label: null });
    expect(result.googleAdsPageviewLabel).toBeNull();
  });

  test("returns googleAdsPageviewLabel when column has value", () => {
    const result = serializePublicPresell({ ...baseRow, google_ads_pageview_label: "PvLabel" });
    expect(result.googleAdsPageviewLabel).toBe("PvLabel");
  });
});

// ── deserializePresellWriteInput — Google Ads labels ─────────────────────────

describe("deserializePresellWriteInput — Google Ads labels", () => {
  const basePayload = {
    slug: "test",
    templateId: "advertorial",
    affiliateUrl: "https://example.com",
  };

  test("maps googleAdsCTALabel to google_ads_cta_label", () => {
    const result = deserializePresellWriteInput({ ...basePayload, googleAdsCTALabel: "AbCdEf" });
    expect(result.google_ads_cta_label).toBe("AbCdEf");
  });

  test("stores null when googleAdsCTALabel is omitted", () => {
    const result = deserializePresellWriteInput({ ...basePayload });
    expect(result.google_ads_cta_label).toBeNull();
  });

  test("maps googleAdsPageviewLabel to google_ads_pageview_label", () => {
    const result = deserializePresellWriteInput({ ...basePayload, googleAdsPageviewLabel: "PvLabel" });
    expect(result.google_ads_pageview_label).toBe("PvLabel");
  });

  test("stores null when googleAdsPageviewLabel is omitted", () => {
    const result = deserializePresellWriteInput({ ...basePayload });
    expect(result.google_ads_pageview_label).toBeNull();
  });
});
