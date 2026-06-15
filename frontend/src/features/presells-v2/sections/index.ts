// side-effect imports to register all section components
import './HeroSection.tsx'
import './FaqSection.tsx'
import './TestimonialsSection.tsx'
import './footer/FooterSection.tsx'

// re-export the populated registry for the SSR sections bundle (esbuild)
export { registry } from './registry.ts'
export { default as HeroSection } from './HeroSection.tsx'
export { default as FaqSection } from './FaqSection.tsx'
export { default as TestimonialsSection } from './TestimonialsSection.tsx'
export { default as FooterSection } from './footer/FooterSection.tsx'
export type {
  Section,
  SectionType,
  HeroProps,
  FaqProps,
  TestimonialsProps,
  FooterProps
} from './types.ts'
