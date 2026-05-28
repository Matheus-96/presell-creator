import { ApiClientError, apiClient } from '@/lib/api/api-client.ts'
import type {
  PresellDetail,
  PresellListResponse,
  PresellWritePayload,
  TemplateCatalogResponse,
  UploadResponse,
} from '@/features/presells/types.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'

const adminApiPaths = {
  presells: '/admin/presells',
  templates: '/admin/templates',
} as const

export function getPublicPresell(slug: string) {
  return apiClient.get<PresellPublicData>(`/public/presells/${slug}`)
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
