import { z } from 'zod'

export const presellFormSchema = z.object({
  id: z.number().nullable(),
  slug: z.string().min(1, 'Slug é obrigatório'),
  status: z.enum(['draft', 'published']),
  templateId: z.string().min(1),
  title: z.string().min(1, 'Título interno é obrigatório'),
  headline: z.string().min(1, 'Título é obrigatório'),
  subtitle: z.string(),
  body: z.string(),
  bulletsText: z.string(),
  ctaText: z.string().min(1, 'Texto do botão é obrigatório'),
  affiliateUrl: z.string().url('Insira uma URL válida'),
  googlePixelId: z.string(),
  trackingParam: z.string(),
  settings: z.record(z.string(), z.unknown()),
  media: z.object({
    heroImageFileName: z.string(),
    initialHeroImageFileName: z.string(),
    heroImageReference: z.any().nullable(),
    backgroundImageFileName: z.string(),
    initialBackgroundImageFileName: z.string(),
    backgroundImageReference: z.any().nullable(),
  }),
  urls: z.any().nullable(),
  timestamps: z.object({
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  }),
  theme: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    background: z.string().optional(),
    surface: z.string().optional(),
    textColor: z.string().optional(),
  }).nullable().optional(),
})

export type PresellFormValues = z.infer<typeof presellFormSchema>
