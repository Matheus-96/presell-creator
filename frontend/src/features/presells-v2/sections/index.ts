// side-effect imports to register all section components
import './hero/HeroSection.tsx'
import './faq/FaqSection.tsx'
import './testimonials/TestimonialsSection.tsx'
import './footer/FooterSection.tsx'
import './product-highlight/ProductHighlightSection.tsx'

// re-export the populated registry for the SSR sections bundle (esbuild)
export { registry } from './registry.ts'
export { default as HeroSection } from './hero/HeroSection.tsx'
export { default as FaqSection } from './faq/FaqSection.tsx'
export { default as TestimonialsSection } from './testimonials/TestimonialsSection.tsx'
export { default as FooterSection } from './footer/FooterSection.tsx'
export { default as ProductHighlightSection } from './product-highlight/ProductHighlightSection.tsx'
export type {
  Section,
  SectionType,
  HeroProps,
  FaqProps,
  TestimonialsProps,
  FooterProps,
  ProductHighlightProps
} from './types.ts'
