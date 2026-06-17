'use strict';

const fs = require('fs');
const path = require('path');
const {
  normalizeSections,
  buildSystemPrompt,
} = require('../services/v2/analyzeUrlForSections');
const analyzeUrlForSectionsModule = require('../services/v2/analyzeUrlForSections');

const AFFILIATE = 'https://affiliate.example.com/track?id=1';

const HERO_INPUT = {
  type: 'hero',
  props: {
    variant: 'centered',
    headline: 'Headline persuasivo',
    subtitle: 'Subtítulo',
    ctaText: 'Comprar agora',
    bgColor: '#101010',
  },
};

const FAQ_INPUT = {
  type: 'faq',
  props: {
    title: 'Perguntas',
    items: [{ question: 'Q?', answer: 'A.' }],
  },
};

const TESTIMONIALS_INPUT = {
  type: 'testimonials',
  props: {
    title: 'O que dizem',
    items: [{ name: 'Ana', role: 'Cliente', text: 'Adorei' }],
  },
};

const FOOTER_INPUT = {
  type: 'footer',
  props: {
    legalText: 'Aviso legal',
    links: [{ label: 'Termos', url: '/termos' }],
  },
};

const PRODUCT_HIGHLIGHT_SINGLE = {
  type: 'product-highlight',
  props: {
    variant: 'single-product',
    name: 'Produto X',
    description: 'Descrição',
    originalPrice: 'R$ 200',
    price: 'R$ 99',
    discountBadge: '-50%',
    ctaText: 'Comprar',
  },
};

const PRODUCT_HIGHLIGHT_BENEFITS = {
  type: 'product-highlight',
  props: {
    variant: 'benefits-list',
    title: 'Benefícios',
    items: [{ icon: '✅', text: 'Frete grátis' }],
  },
};

describe('normalizeSections — dynamic sections', () => {
  test('with [hero, footer] returns 2 elements with order 0 and 1', () => {
    const result = normalizeSections([HERO_INPUT, FOOTER_INPUT], AFFILIATE);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('hero');
    expect(result[0].order).toBe(0);
    expect(result[1].type).toBe('footer');
    expect(result[1].order).toBe(1);
  });

  test('with [hero, faq, footer] returns 3 elements with order 0, 1, 2', () => {
    const result = normalizeSections([HERO_INPUT, FAQ_INPUT, FOOTER_INPUT], AFFILIATE);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.type)).toEqual(['hero', 'faq', 'footer']);
    expect(result.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  test('with [hero, testimonials, footer] returns 3 elements with order 0, 1, 2', () => {
    const result = normalizeSections(
      [HERO_INPUT, TESTIMONIALS_INPUT, FOOTER_INPUT],
      AFFILIATE
    );
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.type)).toEqual(['hero', 'testimonials', 'footer']);
    expect(result.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  test('with all 4 original sections returns 4 elements with order 0–3', () => {
    const result = normalizeSections(
      [HERO_INPUT, FAQ_INPUT, TESTIMONIALS_INPUT, FOOTER_INPUT],
      AFFILIATE
    );
    expect(result).toHaveLength(4);
    expect(result.map((s) => s.type)).toEqual([
      'hero',
      'faq',
      'testimonials',
      'footer',
    ]);
    expect(result.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  test('hero is always first and footer is always last regardless of input order', () => {
    const result = normalizeSections(
      [FOOTER_INPUT, TESTIMONIALS_INPUT, FAQ_INPUT, HERO_INPUT],
      AFFILIATE
    );
    expect(result[0].type).toBe('hero');
    expect(result[result.length - 1].type).toBe('footer');
  });

  test('LLM omits hero → hero generated with defaults at position 0', () => {
    const result = normalizeSections([FAQ_INPUT, FOOTER_INPUT], AFFILIATE);
    expect(result[0].type).toBe('hero');
    expect(result[0].order).toBe(0);
    expect(result[0].props.headline).toBe('');
    expect(result[0].props.ctaText).toBe('Quero saber mais');
    expect(result[0].props.ctaUrl).toBe(AFFILIATE);
    expect(result[0].props.imageUrl).toBeNull();
    expect(result[0].props.bgColor).toBe('#ffffff');
    expect(result[0].props.variant).toBe('centered');
  });

  test('LLM omits footer → footer generated with defaults at last position', () => {
    const result = normalizeSections([HERO_INPUT, FAQ_INPUT], AFFILIATE);
    const last = result[result.length - 1];
    expect(last.type).toBe('footer');
    expect(last.order).toBe(result.length - 1);
    expect(last.props.legalText).toBe('');
    expect(last.props.links).toEqual([]);
  });

  test('faq/testimonials are not included when the LLM does not return them', () => {
    const result = normalizeSections([HERO_INPUT, FOOTER_INPUT], AFFILIATE);
    expect(result.find((s) => s.type === 'faq')).toBeUndefined();
    expect(result.find((s) => s.type === 'testimonials')).toBeUndefined();
  });

  test('hero ctaUrl is always the provided affiliateUrl', () => {
    const result = normalizeSections(
      [
        {
          ...HERO_INPUT,
          props: { ...HERO_INPUT.props, ctaUrl: 'https://wrong.example.com' },
        },
        FOOTER_INPUT,
      ],
      AFFILIATE
    );
    expect(result[0].props.ctaUrl).toBe(AFFILIATE);
  });
});

describe('normalizeSections — hero variants', () => {
  test('hero with variant centered preserves variant', () => {
    const result = normalizeSections([HERO_INPUT, FOOTER_INPUT], AFFILIATE);
    expect(result[0].props.variant).toBe('centered');
  });

  test('hero with variant split preserves variant and imagePosition', () => {
    const input = {
      type: 'hero',
      props: { ...HERO_INPUT.props, variant: 'split', imagePosition: 'left' },
    };
    const result = normalizeSections([input, FOOTER_INPUT], AFFILIATE);
    expect(result[0].props.variant).toBe('split');
    expect(result[0].props.imagePosition).toBe('left');
  });

  test('hero with variant background-image preserves variant', () => {
    const input = {
      type: 'hero',
      props: { ...HERO_INPUT.props, variant: 'background-image' },
    };
    const result = normalizeSections([input, FOOTER_INPUT], AFFILIATE);
    expect(result[0].props.variant).toBe('background-image');
  });

  test('hero with unknown variant falls back to centered', () => {
    const input = {
      type: 'hero',
      props: { ...HERO_INPUT.props, variant: 'unknown-variant' },
    };
    const result = normalizeSections([input, FOOTER_INPUT], AFFILIATE);
    expect(result[0].props.variant).toBe('centered');
  });

  test('hero without variant field defaults to centered', () => {
    const input = {
      type: 'hero',
      props: { headline: 'Test', subtitle: 'Sub', ctaText: 'CTA' },
    };
    const result = normalizeSections([input, FOOTER_INPUT], AFFILIATE);
    expect(result[0].props.variant).toBe('centered');
  });
});

describe('normalizeSections — product-highlight', () => {
  test('product-highlight single-product is included with correct fields', () => {
    const result = normalizeSections(
      [HERO_INPUT, PRODUCT_HIGHLIGHT_SINGLE, FOOTER_INPUT],
      AFFILIATE
    );
    const ph = result.find((s) => s.type === 'product-highlight');
    expect(ph).toBeDefined();
    expect(ph.props.variant).toBe('single-product');
    expect(ph.props.name).toBe('Produto X');
    expect(ph.props.price).toBe('R$ 99');
    expect(ph.props.ctaUrl).toBe(AFFILIATE);
    expect(ph.props.imageUrl).toBeNull();
  });

  test('product-highlight benefits-list is included with items', () => {
    const result = normalizeSections(
      [HERO_INPUT, PRODUCT_HIGHLIGHT_BENEFITS, FOOTER_INPUT],
      AFFILIATE
    );
    const ph = result.find((s) => s.type === 'product-highlight');
    expect(ph).toBeDefined();
    expect(ph.props.variant).toBe('benefits-list');
    expect(ph.props.title).toBe('Benefícios');
    expect(ph.props.items).toHaveLength(1);
    expect(ph.props.items[0].icon).toBe('✅');
  });

  test('product-highlight is placed after hero and before faq', () => {
    const result = normalizeSections(
      [HERO_INPUT, FAQ_INPUT, PRODUCT_HIGHLIGHT_SINGLE, FOOTER_INPUT],
      AFFILIATE
    );
    const types = result.map((s) => s.type);
    expect(types.indexOf('product-highlight')).toBeLessThan(types.indexOf('faq'));
    expect(types.indexOf('product-highlight')).toBeGreaterThan(types.indexOf('hero'));
  });

  test('product-highlight with unknown variant falls back to single-product', () => {
    const input = {
      type: 'product-highlight',
      props: { variant: 'unknown', name: 'Test' },
    };
    const result = normalizeSections([HERO_INPUT, input, FOOTER_INPUT], AFFILIATE);
    const ph = result.find((s) => s.type === 'product-highlight');
    expect(ph.props.variant).toBe('single-product');
  });

  test('product-highlight is not included when not returned by LLM', () => {
    const result = normalizeSections([HERO_INPUT, FOOTER_INPUT], AFFILIATE);
    expect(result.find((s) => s.type === 'product-highlight')).toBeUndefined();
  });
});

describe('buildSystemPrompt — variant catalog', () => {
  test('prompt contains hero variant descriptions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('centered');
    expect(prompt).toContain('split');
    expect(prompt).toContain('background-image');
  });

  test('prompt contains product-highlight variant descriptions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('single-product');
    expect(prompt).toContain('benefits-list');
  });

  test('prompt declares hero and footer as mandatory and others as optional', () => {
    const prompt = buildSystemPrompt().toLowerCase();
    expect(prompt).toMatch(/obrigat/);
    expect(prompt).toMatch(/opcion/);
  });

  test('prompt contains variant field requirement', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('"variant"');
  });
});

describe('analyzeUrlForSections module — system prompt', () => {
  test('system prompt no longer contains the "EXATAMENTE 4" rule', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'v2', 'analyzeUrlForSections.js'),
      'utf8'
    );
    expect(source).not.toMatch(/EXATAMENTE\s+4/i);
  });

  test('module exposes normalizeSections', () => {
    expect(typeof analyzeUrlForSectionsModule.normalizeSections).toBe('function');
  });

  test('module exposes buildSystemPrompt', () => {
    expect(typeof analyzeUrlForSectionsModule.buildSystemPrompt).toBe('function');
  });
});
