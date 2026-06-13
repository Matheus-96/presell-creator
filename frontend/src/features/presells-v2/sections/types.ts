import type React from 'react'

export type SectionType = 'hero' | 'faq' | 'testimonials' | 'footer'

export type HeroProps = {
  headline: string
  subtitle: string
  ctaText: string
  ctaUrl: string
  imageUrl: string | null
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

export type Section =
  | { type: 'hero'; order: number; props: HeroProps }
  | { type: 'faq'; order: number; props: FaqProps }
  | { type: 'testimonials'; order: number; props: TestimonialsProps }
  | { type: 'footer'; order: number; props: FooterProps }

export type SectionComponentProps<P> = { props: P }
export type SectionComponent<P> = React.ComponentType<SectionComponentProps<P>>
