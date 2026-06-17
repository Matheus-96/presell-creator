'use strict';

describe('migration 014_hero_variant_centered — logic', () => {
  function applyMigrationLogic(sectionsJson) {
    let sections;
    try { sections = JSON.parse(sectionsJson); } catch { return sectionsJson; }
    if (!Array.isArray(sections)) return sectionsJson;
    let changed = false;
    for (const section of sections) {
      if (section && section.type === 'hero' && !section.props?.variant) {
        section.props = section.props || {};
        section.props.variant = 'centered';
        changed = true;
      }
    }
    return changed ? JSON.stringify(sections) : sectionsJson;
  }

  test('adds variant:centered to hero section without variant', () => {
    const input = JSON.stringify([
      { type: 'hero', order: 0, props: { headline: 'Test', subtitle: 'Sub', ctaText: 'CTA', ctaUrl: '', imageUrl: null, bgColor: '#fff' } },
      { type: 'footer', order: 1, props: { legalText: 'Legal', links: [] } },
    ]);
    const result = JSON.parse(applyMigrationLogic(input));
    expect(result[0].props.variant).toBe('centered');
    expect(result[0].props.headline).toBe('Test');
    expect(result[1].props.variant).toBeUndefined();
  });

  test('does not modify hero that already has variant', () => {
    const input = JSON.stringify([
      { type: 'hero', order: 0, props: { variant: 'split', headline: 'Test', subtitle: 'Sub', ctaText: 'CTA', ctaUrl: '', imageUrl: null } },
      { type: 'footer', order: 1, props: { legalText: '', links: [] } },
    ]);
    const result = JSON.parse(applyMigrationLogic(input));
    expect(result[0].props.variant).toBe('split');
  });

  test('does not modify non-hero sections', () => {
    const input = JSON.stringify([
      { type: 'hero', order: 0, props: { headline: 'H' } },
      { type: 'faq', order: 1, props: { title: 'FAQ', items: [] } },
      { type: 'footer', order: 2, props: { legalText: '', links: [] } },
    ]);
    const result = JSON.parse(applyMigrationLogic(input));
    expect(result[0].props.variant).toBe('centered');
    expect(result[1].props.variant).toBeUndefined();
    expect(result[2].props.variant).toBeUndefined();
  });

  test('handles invalid JSON gracefully', () => {
    const input = 'not json';
    expect(applyMigrationLogic(input)).toBe('not json');
  });
});
