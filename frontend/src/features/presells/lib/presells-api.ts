import { ApiClientError, apiClient } from '@/lib/api/api-client.ts'
import type {
  PresellDetail,
  PresellListResponse,
  PresellTheme,
  PresellWritePayload,
  TemplateCatalogResponse,
  UploadResponse,
} from '@/features/presells/types.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'

const adminApiPaths = {
  presells: '/admin/presells',
  templates: '/admin/templates',
} as const

export interface AnalyzeUrlResult {
  templateId: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  heroImageUrl: string | null
  theme: PresellTheme | null
  settings: Record<string, unknown>
  extractedImages: { url: string; type: string }[]
}

export type AnalyzeJobStatus =
  | { status: 'extracting' | 'downloading' | 'analyzing'; message: string }
  | { status: 'done'; message: string; result: AnalyzeUrlResult }
  | { status: 'failed'; message: string; error: string; errorCode?: string }

export class AnalyzeJobExpiredError extends Error {
  constructor() {
    super('A análise expirou. Tente novamente.')
    this.name = 'AnalyzeJobExpiredError'
  }
}

export async function startAnalyzeUrl(
  url: string,
  userInstructions?: string,
  language: string = 'pt-BR',
): Promise<{ jobId: string }> {
  try {
    return await apiClient.post<{ jobId: string }>(`${adminApiPaths.presells}/analyze-url`, {
      body: {
        url,
        language,
        ...(userInstructions ? { userInstructions } : {}),
      },
    })
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 409) {
      try {
        const payload = JSON.parse(err.details) as {
          error?: { code?: string; details?: { jobId?: string } }
        }
        const jobId = payload.error?.details?.jobId
        if (payload.error?.code === 'job_in_progress' && jobId) {
          return { jobId }
        }
      } catch {
        // fall through
      }
    }
    throw err
  }
}

export async function pollAnalyzeJob(jobId: string): Promise<AnalyzeJobStatus> {
  try {
    return await apiClient.get<AnalyzeJobStatus>(
      `${adminApiPaths.presells}/analyze-url/${jobId}`,
    )
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      throw new AnalyzeJobExpiredError()
    }
    throw err
  }
}

export function getPublicPresell(slug: string) {
  const qs = window.location.search
  return apiClient.get<PresellPublicData>(`/public/presells/${slug}${qs}`)
}

export function listTemplates() {
  return apiClient.get<TemplateCatalogResponse>(adminApiPaths.templates)
}

export function listPresells(limit: number) {
  return apiClient.get<PresellListResponse>(adminApiPaths.presells, {
    query: { limit },
  })
}

export function getPresell(id: number) {
  return apiClient.get<PresellDetail>(`${adminApiPaths.presells}/${id}`)
}

export function createPresell(payload: PresellWritePayload) {
  return apiClient.post<PresellDetail>(adminApiPaths.presells, { body: payload })
}

export function updatePresell(id: number, payload: PresellWritePayload) {
  return apiClient.patch<PresellDetail>(`${adminApiPaths.presells}/${id}`, { body: payload })
}

export function deletePresell(id: number) {
  return apiClient.delete<void>(`${adminApiPaths.presells}/${id}`)
}

export function duplicatePresell(id: number) {
  return apiClient.post<PresellDetail>(`${adminApiPaths.presells}/${id}/duplicate`)
}

export function uploadMedia(file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiClient.post<UploadResponse>('/admin/uploads', { body: form })
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    try {
      const payload = JSON.parse(error.details) as { message?: string }
      if (payload.message) {
        return payload.message
      }
    } catch {
      return error.message || fallbackMessage
    }

    return error.message || fallbackMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}
