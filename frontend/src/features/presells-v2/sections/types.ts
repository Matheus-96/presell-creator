import type React from 'react'

export type SectionType = 'hero' | 'faq' | 'testimonials' | 'footer' | 'product-highlight'

export type HeroVariant = 'centered' | 'split' | 'background-image'

export type HeroProps = {
  variant?: HeroVariant
  headline: string
  subtitle: string
  ctaText: string
  ctaUrl: string
  imageUrl: string | null
  imagePosition?: 'left' | 'right'
  bgColor?: string | null
}

export type FaqItem = { question: string; answer: string }
export type FaqProps = {
  title: string
  items: FaqItem[]
}

export type TestimonialItem = {
  name: string
  role: string
  text: string
  avatarUrl: string | null
}
export type TestimonialsProps = {
  title: string
  items: TestimonialItem[]
}

export type FooterLink = { label: string; url: string }
export type FooterProps = {
  legalText: string
  links: FooterLink[]
}

export type ProductHighlightVariant = 'single-product' | 'benefits-list'

export type BenefitItem = { icon: string; text: string }

export type ProductHighlightProps = {
  variant: ProductHighlightVariant
  title?: string
  imageUrl?: string | null
  name?: string
  description?: string
  originalPrice?: string
  price?: string
  discountBadge?: string
  ctaText?: string
  ctaUrl?: string
  items?: BenefitItem[]
}

export type Section =
  | { type: 'hero'; order: number; props: HeroProps }
  | { type: 'faq'; order: number; props: FaqProps }
  | { type: 'testimonials'; order: number; props: TestimonialsProps }
  | { type: 'footer'; order: number; props: FooterProps }
  | { type: 'product-highlight'; order: number; props: ProductHighlightProps }

export type SectionComponentProps<P> = { props: P }
export type SectionComponent<P> = React.ComponentType<SectionComponentProps<P>>
