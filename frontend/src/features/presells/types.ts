export type PresellStatus = 'draft' | 'published'

export type StatusTone = 'info' | 'warning'

export type AdminSession = {
  authenticated: boolean
  authStrategy: string
  csrfToken: string | null
  user: {
    username: string
  } | null
  capabilities: string[]
  links: {
    session: string
    login: string
    logout: string
    contracts: string
    templates: string
    previews: string
    presells: string
    analytics: string
    analyticsSummary: string
  }
}

export type AdminApiContract = {
  version: number | string
  basePath: string
  auth: {
    strategy: string
    csrf: {
      header: string
      body: string[]
    }
  }
  pagination?: {
    defaultLimit?: number
    maxLimit?: number
  }
}

export type MediaReference = {
  fileName: string
  originalName: string | null
  mimeType: string | null
  size: number | null
  url: string
}

export type PresellSummary = {
  id: number
  slug: string
  status: PresellStatus
  templateId: string
  title: string
  headline: string
  subtitle?: string
  ctaText: string
  affiliateUrl: string
  published: boolean
  media: {
    heroImage: MediaReference | null
    backgroundImage: MediaReference | null
  }
  tracking: {
    googlePixelId: string | null
  }
  timestamps: {
    createdAt: string | null
    updatedAt: string | null
  }
}

export type PresellDetail = PresellSummary & {
  body: string
  bullets: string[]
  settings: Record<string, unknown>
  urls: {
    publicPage: string
    redirect: string
    adminPreview: string
  }
}

export type PresellListResponse = {
  items: PresellSummary[]
  pageInfo: {
    limit: number
    nextCursor: string | null
    hasMore: boolean
  }
}

export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'color'
  | 'range'

export type TemplateFieldOption = {
  value: string
  label: string
}

export type TemplateField = {
  name: string
  label: string
  type: TemplateFieldType
  defaultValue: unknown
  helpText: string | null
  min: number | null
  max: number | null
  step: number | null
  previewSelector: string | null
  options: TemplateFieldOption[]
}

export type TemplateMetadata = {
  id: string
  name: string
  description: string
  renderer?: {
    templateId: string
    kind: string
    engine: string
    entry: string
    view: string
    fileName: string
  }
  previewContract?: {
    schemaVersion: number
    templateId: string
    selectors: Record<string, string>
    fields: Array<{
      key: string
      inputName: string
      selector: string
      source: string
    }>
  }
  fields: TemplateField[]
}

export type TemplateCatalogResponse = {
  items: TemplateMetadata[]
}

export type TemplateSettingValue = string | number | boolean

export type PresellFormState = {
  id: number | null
  slug: string
  status: PresellStatus
  templateId: string
  title: string
  headline: string
  subtitle: string
  body: string
  bulletsText: string
  ctaText: string
  affiliateUrl: string
  googlePixelId: string
  settings: Record<string, TemplateSettingValue>
  media: {
    heroImageFileName: string
    initialHeroImageFileName: string
    heroImageReference: MediaReference | null
    backgroundImageFileName: string
    initialBackgroundImageFileName: string
    backgroundImageReference: MediaReference | null
  }
  urls: PresellDetail['urls'] | null
  timestamps: PresellSummary['timestamps']
}

export type PresellWritePayload = {
  slug: string
  status: PresellStatus
  templateId: string
  title: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  affiliateUrl: string
  googlePixelId: string | null
  settings: Record<string, TemplateSettingValue>
  media?: {
    heroImage?: { fileName: string } | null
    backgroundImage?: { fileName: string } | null
  }
}

export type PreviewRequest = {
  basePresellId?: number
  presell: PresellWritePayload
}

export type PreviewRuntime = {
  schemaVersion: number
  mode: 'preview' | 'public'
  templateId: string
  renderer: NonNullable<TemplateMetadata['renderer']>
  previewContract: NonNullable<TemplateMetadata['previewContract']>
}

export type PreviewDocument = {
  html: string
  contentType: 'text/html'
  presell: PresellDetail
  template: TemplateMetadata
  runtime: PreviewRuntime
}

export type WorkspaceNotice = {
  title: string
  description: string
  tone?: StatusTone
}
