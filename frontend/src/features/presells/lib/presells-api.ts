import { ApiClientError, apiClient } from '@/lib/api/api-client.ts'
import { appConfig } from '@/config/app-config.ts'
import type {
  AdminApiContract,
  AdminSession,
  PresellDetail,
  PresellListResponse,
  PreviewDocument,
  PreviewRequest,
  PresellWritePayload,
  TemplateCatalogResponse,
} from '@/features/presells/types.ts'

const adminApiPaths = {
  contracts: '/admin/contracts',
  presells: '/admin/presells',
  previews: '/admin/previews',
  session: appConfig.auth.sessionPath,
  templates: '/admin/templates',
} as const

function createCsrfHeaders(csrfHeaderName: string, csrfToken: string | null) {
  const headers = new Headers()

  if (csrfToken) {
    headers.set(csrfHeaderName, csrfToken)
  }

  return headers
}

export async function fetchWorkspaceBootstrap() {
  const [session, contract] = await Promise.all([
    apiClient.get<AdminSession>(adminApiPaths.session),
    apiClient.get<AdminApiContract>(adminApiPaths.contracts),
  ])

  return {
    contract,
    session,
  }
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

export function renderPreview(
  payload: PreviewRequest,
  contract: AdminApiContract,
  csrfToken: string | null,
) {
  return apiClient.post<PreviewDocument>(adminApiPaths.previews, {
    body: payload,
    headers: createCsrfHeaders(contract.auth.csrf.header, csrfToken),
  })
}

export function createPresell(
  payload: PresellWritePayload,
  contract: AdminApiContract,
  csrfToken: string | null,
) {
  return apiClient.post<PresellDetail>(adminApiPaths.presells, {
    body: payload,
    headers: createCsrfHeaders(contract.auth.csrf.header, csrfToken),
  })
}

export function updatePresell(
  id: number,
  payload: PresellWritePayload,
  contract: AdminApiContract,
  csrfToken: string | null,
) {
  return apiClient.patch<PresellDetail>(`${adminApiPaths.presells}/${id}`, {
    body: payload,
    headers: createCsrfHeaders(contract.auth.csrf.header, csrfToken),
  })
}

export function deletePresell(
  id: number,
  contract: AdminApiContract,
  csrfToken: string | null,
) {
  return apiClient.delete<void>(`${adminApiPaths.presells}/${id}`, {
    headers: createCsrfHeaders(contract.auth.csrf.header, csrfToken),
  })
}

export function duplicatePresell(
  id: number,
  contract: AdminApiContract,
  csrfToken: string | null,
) {
  return apiClient.post<PresellDetail>(`${adminApiPaths.presells}/${id}/duplicate`, {
    headers: createCsrfHeaders(contract.auth.csrf.header, csrfToken),
  })
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
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
