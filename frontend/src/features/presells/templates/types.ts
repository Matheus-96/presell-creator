import type React from 'react'
import type { PresellTheme } from '../types'

export type PresellPublicData = {
  id: number
  slug: string
  templateId: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  affiliateUrl: string
  googlePixelId: string | null
  trackingParam: string
  imageUrl: string | null
  backgroundImageUrl: string | null
  settings: Record<string, unknown>
  theme?: PresellTheme | null
}

export type TemplateComponentProps = {
  presell: PresellPublicData
}

export type TemplateComponent = React.ComponentType<TemplateComponentProps>
