'use strict';

const {
  normalizeSections,
} = require('../services/v2/analyzeUrlForSections');
const analyzeUrlForSectionsModule = require('../services/v2/analyzeUrlForSections');
const fs = require('fs');
const path = require('path');

const AFFILIATE = 'https://affiliate.example.com/track?id=1';

const HERO_INPUT = {
  type: 'hero',
  props: {
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

  test('with all 4 sections returns 4 elements with order 0–3', () => {
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
    expect(result.map((s) => s.order)).toEqual([0, 1, 2, 3]);
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

describe('analyzeUrlForSections module — system prompt', () => {
  test('system prompt no longer contains the "EXATAMENTE 4" rule', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'v2', 'analyzeUrlForSections.js'),
      'utf8'
    );
    expect(source).not.toMatch(/EXATAMENTE\s+4/i);
  });

  test('system prompt declares hero and footer as mandatory and faq/testimonials as optional', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'v2', 'analyzeUrlForSections.js'),
      'utf8'
    );
    expect(source.toLowerCase()).toMatch(/obrigat/);
    expect(source.toLowerCase()).toMatch(/opcion/);
  });

  test('module exposes normalizeSections', () => {
    expect(typeof analyzeUrlForSectionsModule.normalizeSections).toBe('function');
  });
});
