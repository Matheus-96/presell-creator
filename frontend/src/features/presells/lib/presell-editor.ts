import type {
  PresellDetail,
  PresellFormState,
  PreviewRequest,
  PresellWritePayload,
  TemplateField,
  TemplateMetadata,
  TemplateSettingValue,
} from '@/features/presells/types.ts'

function normalizeFieldValue(
  field: TemplateField,
  value: unknown,
): TemplateSettingValue {
  if (field.type === 'checkbox') {
    return value === true || value === 'true' || value === 'on' || value === '1'
  }

  if (field.type === 'range') {
    const fallback = Number(getDefaultFieldValue(field))
    const minimum = field.min ?? fallback
    const maximum = field.max ?? fallback
    const numericValue = Number(value ?? fallback)

    if (!Number.isFinite(numericValue)) {
      return fallback
    }

    return Math.min(Math.max(numericValue, minimum), maximum)
  }

  if (field.type === 'select') {
    const selectedValue = String(value ?? getDefaultFieldValue(field) ?? '')
    const hasOption = field.options.some((option) => option.value === selectedValue)

    return hasOption ? selectedValue : String(getDefaultFieldValue(field) ?? '')
  }

  return String(value ?? getDefaultFieldValue(field) ?? '')
}

export function getDefaultFieldValue(field: TemplateField): TemplateSettingValue {
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    return normalizeFieldValue(
      {
        ...field,
        defaultValue: undefined,
      },
      field.defaultValue,
    )
  }

  if (field.type === 'checkbox') {
    return false
  }

  if (field.type === 'select') {
    return field.options[0]?.value ?? ''
  }

  if (field.type === 'range') {
    return field.min ?? 0
  }

  return ''
}

export function buildTemplateSettings(
  template: TemplateMetadata | null,
  input: Record<string, unknown> = {},
) {
  if (!template) {
    return {}
  }

  return template.fields.reduce<Record<string, TemplateSettingValue>>((settings, field) => {
    settings[field.name] = normalizeFieldValue(field, input[field.name])
    return settings
  }, {})
}

export function createEmptyPresellForm(template: TemplateMetadata | null): PresellFormState {
  return {
    id: null,
    slug: '',
    status: 'draft',
    templateId: template?.id ?? 'advertorial',
    title: '',
    headline: '',
    subtitle: '',
    body: '',
    bulletsText: '',
    ctaText: 'Continuar',
    affiliateUrl: '',
    googlePixelId: '',
    settings: buildTemplateSettings(template),
    media: {
      heroImageFileName: '',
      initialHeroImageFileName: '',
      heroImageReference: null,
      backgroundImageFileName: '',
      initialBackgroundImageFileName: '',
      backgroundImageReference: null,
    },
    urls: null,
    timestamps: {
      createdAt: null,
      updatedAt: null,
    },
  }
}

export function createPresellForm(
  detail: PresellDetail,
  template: TemplateMetadata | null,
): PresellFormState {
  return {
    id: detail.id,
    slug: detail.slug,
    status: detail.status,
    templateId: detail.templateId,
    title: detail.title,
    headline: detail.headline,
    subtitle: detail.subtitle ?? '',
    body: detail.body,
    bulletsText: detail.bullets.join('\n'),
    ctaText: detail.ctaText,
    affiliateUrl: detail.affiliateUrl,
    googlePixelId: detail.tracking.googlePixelId ?? '',
    settings: buildTemplateSettings(template, detail.settings),
    media: {
      heroImageFileName: detail.media.heroImage?.fileName ?? '',
      initialHeroImageFileName: detail.media.heroImage?.fileName ?? '',
      heroImageReference: detail.media.heroImage,
      backgroundImageFileName: detail.media.backgroundImage?.fileName ?? '',
      initialBackgroundImageFileName: detail.media.backgroundImage?.fileName ?? '',
      backgroundImageReference: detail.media.backgroundImage,
    },
    urls: detail.urls,
    timestamps: detail.timestamps,
  }
}

export function applyTemplateSettings(
  template: TemplateMetadata | null,
  currentSettings: Record<string, TemplateSettingValue>,
) {
  return buildTemplateSettings(template, currentSettings)
}

export function buildPresellPayload(
  form: PresellFormState,
  template: TemplateMetadata | null,
): PresellWritePayload {
  const heroImageFileName = form.media.heroImageFileName.trim()
  const backgroundImageFileName = form.media.backgroundImageFileName.trim()
  const media: NonNullable<PresellWritePayload['media']> = {}

  if (heroImageFileName !== form.media.initialHeroImageFileName.trim()) {
    media.heroImage = heroImageFileName ? { fileName: heroImageFileName } : null
  }

  if (backgroundImageFileName !== form.media.initialBackgroundImageFileName.trim()) {
    media.backgroundImage = backgroundImageFileName
      ? { fileName: backgroundImageFileName }
      : null
  }

  return {
    slug: form.slug.trim(),
    status: form.status,
    templateId: form.templateId,
    title: form.title.trim(),
    headline: form.headline.trim(),
    subtitle: form.subtitle.trim(),
    body: form.body.trim(),
    bullets: form.bulletsText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    ctaText: form.ctaText.trim(),
    affiliateUrl: form.affiliateUrl.trim(),
    googlePixelId: form.googlePixelId.trim() || null,
    settings: buildTemplateSettings(template, form.settings),
    ...(Object.keys(media).length > 0 ? { media } : {}),
  }
}

export function buildPreviewPayload(
  form: PresellFormState,
  template: TemplateMetadata | null,
): PreviewRequest {
  return {
    ...(form.id ? { basePresellId: form.id } : {}),
    presell: buildPresellPayload(form, template),
  }
}

export function createPresellSnapshot(form: PresellFormState) {
  const orderedSettings = Object.keys(form.settings)
    .sort()
    .reduce<Record<string, TemplateSettingValue>>((settings, key) => {
      settings[key] = form.settings[key]
      return settings
    }, {})

  return JSON.stringify({
    id: form.id,
    slug: form.slug,
    status: form.status,
    templateId: form.templateId,
    title: form.title,
    headline: form.headline,
    subtitle: form.subtitle,
    body: form.body,
    bulletsText: form.bulletsText,
    ctaText: form.ctaText,
    affiliateUrl: form.affiliateUrl,
    googlePixelId: form.googlePixelId,
    settings: orderedSettings,
    heroImageFileName: form.media.heroImageFileName,
    backgroundImageFileName: form.media.backgroundImageFileName,
  })
}

export function getTemplateById(
  templates: TemplateMetadata[],
  templateId: string,
): TemplateMetadata | null {
  return templates.find((template) => template.id === templateId) ?? templates[0] ?? null
}
