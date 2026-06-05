/**
 * Tests for presellRenderer — geração de HTML estático a partir de um presell.
 * Mocka as dependências de banco para testar a renderização de forma isolada.
 */

jest.mock("../templates/templates.bundle.js", () => {
  const React = require("react");
  return {
    registry: {
      "offer-modal": function OfferModal({ presell }) {
        return React.createElement("div", null, presell.headline);
      },
    },
  };
}, { virtual: true });

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

const { renderPresellHtml } = require("../services/presellRenderer");

function buildPresell(overrides = {}) {
  return {
    id: 1,
    slug: "meu-presell",
    template: "offer-modal",
    title: "Título",
    headline: "Headline Teste",
    subtitle: "Subtítulo",
    body: "",
    bullets: "",
    cta_text: "Continuar",
    affiliate_url: "https://exemplo.com",
    settings_json: "{}",
    google_pixel: null,
    tracking_param: "gclid",
    image_path: "",
    background_image_path: "",
    theme: null,
    gallery_images: "[]",
    ...overrides,
  };
}

describe("renderPresellHtml", () => {
  it("inclui o headline do presell no HTML", () => {
    const html = renderPresellHtml(buildPresell({ headline: "Headline Teste" }));
    expect(html).toContain("Headline Teste");
  });

  it("inclui o canonical com o slug do presell", () => {
    const html = renderPresellHtml(buildPresell({ slug: "meu-presell" }));
    expect(html).toMatch(/<link rel="canonical" href="\/p\/meu-presell">/);
  });

  it("injeta o Google Pixel quando configurado", () => {
    const html = renderPresellHtml(buildPresell({ google_pixel: "AW-123" }));
    expect(html).toContain("AW-123");
  });

  it("não injeta código de pixel quando google_pixel é null", () => {
    const html = renderPresellHtml(buildPresell({ google_pixel: null }));
    expect(html).not.toContain("gtag");
    expect(html).not.toContain("googletagmanager");
  });

  describe("Google Ads CTA conversion", () => {
    it("injeta event_callback com send_to correto quando pixel e label CTA configurados", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789",
        google_ads_cta_label: "abc123XYZ"
      }));
      expect(html).toContain("event_callback");
      expect(html).toContain("AW-123456789/abc123XYZ");
    });

    it("não injeta event_callback quando label CTA ausente", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789",
        google_ads_cta_label: null
      }));
      expect(html).not.toContain("event_callback");
    });

    it("não injeta event_callback quando pixel ausente mas label CTA presente", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: null,
        google_ads_cta_label: "abc123XYZ"
      }));
      expect(html).not.toContain("event_callback");
    });
  });

  describe("Google Ads pageview conversion", () => {
    it("injeta gtag conversion de pageview quando pixel e label pageview configurados", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789",
        google_ads_pageview_label: "pv_label_XYZ"
      }));
      expect(html).toContain("gtag('event','conversion'");
      expect(html).toContain("AW-123456789/pv_label_XYZ");
    });

    it("não injeta gtag conversion de pageview quando label ausente", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789",
        google_ads_pageview_label: null
      }));
      expect(html).not.toContain("gtag('event','conversion'");
    });

    it("não injeta gtag conversion de pageview quando pixel ausente", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: null,
        google_ads_pageview_label: "pv_label_XYZ"
      }));
      expect(html).not.toContain("gtag('event','conversion'");
    });
  });

  describe("wbraid/gbraid nos eventos de conversão", () => {
    it("inclui clickIds e Object.assign no CTA quando conversão CTA configurada", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789",
        google_ads_cta_label: "abc123XYZ"
      }));
      expect(html).toContain("clickIds");
      expect(html).toContain("Object.assign(");
      expect(html).toContain("params['wbraid']");
      expect(html).toContain("params['gbraid']");
    });

    it("inclui clickIds e Object.assign no pageview quando conversão pageview configurada", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789",
        google_ads_pageview_label: "pv_label_XYZ"
      }));
      expect(html).toContain("clickIds");
      expect(html).toContain("Object.assign(");
      expect(html).toContain("params['wbraid']");
      expect(html).toContain("params['gbraid']");
    });

    it("não inclui clickIds quando não há nenhuma conversão configurada", () => {
      const html = renderPresellHtml(buildPresell({
        google_pixel: "AW-123456789"
      }));
      expect(html).not.toContain("clickIds");
    });

    it("não inclui clickIds quando pixel ausente", () => {
      const html = renderPresellHtml(buildPresell({ google_pixel: null }));
      expect(html).not.toContain("clickIds");
    });
  });

  it("lança erro quando o templateId não existe no bundle", () => {
    expect(() => renderPresellHtml(buildPresell({ template: "inexistente" }))).toThrow(
      /inexistente/
    );
  });

  it("inclui o script inline de tracking no HTML", () => {
    const html = renderPresellHtml(buildPresell({ slug: "meu-presell", affiliate_url: "https://aff.example.com" }));
    expect(html).toContain("page_view");
    expect(html).toContain("data-presell-cta");
    expect(html).toContain("meu-presell");
  });

  it("embute a affiliateUrl no script de tracking", () => {
    const html = renderPresellHtml(buildPresell({ affiliate_url: "https://aff.example.com" }));
    expect(html).toContain("https://aff.example.com");
  });
});
