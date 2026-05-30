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

// ── deserializePresellWriteInput ──────────────────────────────────────────────

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
