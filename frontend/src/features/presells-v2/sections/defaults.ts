import type { Section, SectionType } from './types.ts'

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  faq: 'FAQ',
  testimonials: 'Depoimentos',
  'product-highlight': 'Destaque de produto',
  footer: 'Rodapé',
}

export function createDefaultSection(type: SectionType, order: number): Section {
  switch (type) {
    case 'hero':
      return { type, order, props: { headline: '', subtitle: '', ctaText: '', ctaUrl: '', imageUrl: null } }
    case 'faq':
      return { type, order, props: { title: '', items: [] } }
    case 'testimonials':
      return { type, order, props: { title: '', items: [] } }
    case 'footer':
      return { type, order, props: { legalText: '', links: [] } }
    case 'product-highlight':
      return { type, order, props: { variant: 'single-product' } }
  }
}
