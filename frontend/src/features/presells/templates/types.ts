import type React from 'react'

export type PresellPublicData = {
  slug: string
  template: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  affiliateUrl: string
  googlePixelId: string | null
  imageUrl: string | null
  backgroundImageUrl: string | null
  settings: Record<string, unknown>
}

export type TemplateComponentProps = {
  presell: PresellPublicData
}

export type TemplateComponent = React.ComponentType<TemplateComponentProps>
