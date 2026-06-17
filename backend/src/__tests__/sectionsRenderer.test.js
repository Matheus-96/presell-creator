/**
 * Tests para sectionsRenderer (V2) — geração de HTML estático a partir de um
 * array de seções (hero/faq/testimonials/footer). Mocka o bundle de seções
 * para não depender do build do frontend.
 */

jest.mock("../templates/sections.bundle.js", () => {
  const React = require("react");
  return {
    registry: {
      hero: function Hero({ props }) {
        return React.createElement(
          "section",
          { "data-section": "hero" },
          React.createElement("h1", null, props.headline),
          React.createElement("p", null, props.subtitle),
          React.createElement(
            "a",
            { href: props.ctaUrl, "data-cta": true },
            props.ctaText
          ),
          props.imageUrl
            ? React.createElement("img", { src: props.imageUrl, alt: "" })
            : React.createElement("div", { "data-placeholder": "hero-image" })
        );
      },
      faq: function Faq({ props }) {
        return React.createElement(
          "section",
          { "data-section": "faq" },
          React.createElement("h2", null, props.title),
          React.createElement(
            "ul",
            null,
            (props.items || []).map((item, i) =>
              React.createElement(
                "li",
                { key: i },
                React.createElement("strong", null, item.question),
                React.createElement("span", null, item.answer)
              ))
          )
        );
      },
      testimonials: function Testimonials({ props }) {
        return React.createElement(
          "section",
          { "data-section": "testimonials" },
          React.createElement("h2", null, props.title),
          (props.items || []).map((item, i) =>
            React.createElement(
              "article",
              { key: i },
              React.createElement("strong", null, item.name),
              React.createElement("em", null, item.role),
              React.createElement("p", null, item.text),
              item.avatarUrl
                ? React.createElement("img", { src: item.avatarUrl, alt: "" })
                : React.createElement("div", {
                  "data-placeholder": "avatar"
                })
            ))
        );
      },
      footer: function Footer({ props }) {
        return React.createElement(
          "footer",
          { "data-section": "footer" },
          React.createElement("p", null, props.legalText),
          React.createElement(
            "ul",
            null,
            (props.links || []).map((link, i) =>
              React.createElement(
                "li",
                { key: i },
                React.createElement("a", { href: link.url }, link.label)
              ))
          )
        );
      },
      "product-highlight": function ProductHighlight({ props }) {
        if (props.variant === "benefits-list") {
          return React.createElement(
            "section",
            { "data-section": "product-highlight", "data-variant": "benefits-list" },
            React.createElement("h2", null, props.title),
            React.createElement(
              "ul",
              null,
              (props.items || []).map((item, i) =>
                React.createElement("li", { key: i },
                  React.createElement("span", null, item.icon),
                  React.createElement("span", null, item.text)
                ))
            )
          );
        }
        return React.createElement(
          "section",
          { "data-section": "product-highlight", "data-variant": "single-product" },
          React.createElement("h2", null, props.name),
          React.createElement("p", null, props.description),
          props.discountBadge ? React.createElement("span", { "data-badge": true }, props.discountBadge) : null,
          React.createElement("span", { "data-price": "original" }, props.originalPrice),
          React.createElement("span", { "data-price": "current" }, props.price),
          React.createElement("a", { href: props.ctaUrl, "data-cta": true }, props.ctaText)
        );
      }
    }
  };
}, { virtual: true });

const { renderSectionsToHtml } = require("../services/sectionsRenderer");

const sampleSections = [
  {
    type: "hero",
    order: 0,
    props: {
      headline: "Conheça nosso produto",
      subtitle: "A melhor solução do mercado",
      ctaText: "Quero saber mais",
      ctaUrl: "https://afiliado.example.com/oferta",
      imageUrl: null,
      bgColor: "#ffffff"
    }
  },
  {
    type: "faq",
    order: 1,
    props: {
      title: "Perguntas Frequentes",
      items: [
        { question: "Como funciona?", answer: "Muito simples." },
        { question: "Tem garantia?", answer: "Sim, 7 dias." }
      ]
    }
  },
  {
    type: "testimonials",
    order: 2,
    props: {
      title: "Depoimentos",
      items: [
        {
          name: "Ana Souza",
          role: "Cliente",
          text: "Mudou minha vida",
          avatarUrl: null
        }
      ]
    }
  },
  {
    type: "footer",
    order: 3,
    props: {
      legalText: "© 2026 Empresa LTDA",
      links: [{ label: "Termos de uso", url: "/termos" }]
    }
  }
];

describe("renderSectionsToHtml", () => {
  it("retorna uma string HTML completa com doctype", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(typeof html).toBe("string");
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("inclui Tailwind CSS via CDN no <head>", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toMatch(
      /<script[^>]+src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/
    );
  });

  it("renderiza os textos da seção hero", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toContain("Conheça nosso produto");
    expect(html).toContain("A melhor solução do mercado");
    expect(html).toContain("Quero saber mais");
    expect(html).toContain("https://afiliado.example.com/oferta");
  });

  it("renderiza os textos da seção faq", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toContain("Perguntas Frequentes");
    expect(html).toContain("Como funciona?");
    expect(html).toContain("Muito simples.");
    expect(html).toContain("Tem garantia?");
  });

  it("renderiza os textos da seção testimonials", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toContain("Depoimentos");
    expect(html).toContain("Ana Souza");
    expect(html).toContain("Cliente");
    expect(html).toContain("Mudou minha vida");
  });

  it("renderiza os textos da seção footer", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toContain("© 2026 Empresa LTDA");
    expect(html).toContain("Termos de uso");
    expect(html).toContain("/termos");
  });

  it("respeita a ordem definida pelo campo order", () => {
    const reordered = [
      { ...sampleSections[3], order: 0 },
      { ...sampleSections[0], order: 1 },
      { ...sampleSections[1], order: 2 },
      { ...sampleSections[2], order: 3 }
    ];
    const html = renderSectionsToHtml(reordered);
    const footerIndex = html.indexOf("data-section=\"footer\"");
    const heroIndex = html.indexOf("data-section=\"hero\"");
    expect(footerIndex).toBeGreaterThan(-1);
    expect(heroIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeLessThan(heroIndex);
  });

  it("usa placeholder quando imageUrl da seção hero é null", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toContain("data-placeholder=\"hero-image\"");
  });

  it("usa placeholder quando avatarUrl do depoimento é null", () => {
    const html = renderSectionsToHtml(sampleSections);
    expect(html).toContain("data-placeholder=\"avatar\"");
  });

  it("ignora silenciosamente seções de tipo desconhecido", () => {
    const sectionsWithUnknown = [
      ...sampleSections,
      { type: "outro", order: 99, props: {} }
    ];
    const html = renderSectionsToHtml(sectionsWithUnknown);
    expect(html).toContain("Conheça nosso produto");
    expect(html).toContain("© 2026 Empresa LTDA");
  });

  it("retorna HTML válido mesmo com array vazio", () => {
    const html = renderSectionsToHtml([]);
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toMatch(
      /<script[^>]+src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/
    );
  });

  it("renderiza seção product-highlight single-product", () => {
    const sections = [
      ...sampleSections,
      {
        type: "product-highlight",
        order: 1.5,
        props: {
          variant: "single-product",
          name: "Produto Premium",
          description: "O melhor produto",
          originalPrice: "R$ 200,00",
          price: "R$ 99,00",
          discountBadge: "-50%",
          ctaText: "Comprar",
          ctaUrl: "https://example.com/buy"
        }
      }
    ];
    const html = renderSectionsToHtml(sections);
    expect(html).toContain("Produto Premium");
    expect(html).toContain("O melhor produto");
    expect(html).toContain("R$ 200,00");
    expect(html).toContain("R$ 99,00");
    expect(html).toContain("-50%");
    expect(html).toContain("Comprar");
  });

  it("renderiza seção product-highlight benefits-list", () => {
    const sections = [
      ...sampleSections,
      {
        type: "product-highlight",
        order: 1.5,
        props: {
          variant: "benefits-list",
          title: "Por que escolher?",
          items: [
            { icon: "✅", text: "Frete grátis" },
            { icon: "🎁", text: "Brinde exclusivo" }
          ]
        }
      }
    ];
    const html = renderSectionsToHtml(sections);
    expect(html).toContain("Por que escolher?");
    expect(html).toContain("Frete grátis");
    expect(html).toContain("Brinde exclusivo");
  });
});
