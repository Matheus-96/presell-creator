import { ApiClientError, apiClient } from '@/lib/api/api-client.ts'
import type { Section } from '@/features/presells-v2/sections/types.ts'

const adminApiPaths = {
  presellsV2: '/admin/presells-v2',
  analyzeUrlV2: '/admin/presells-v2/analyze-url',
} as const

export interface PresellV2Summary {
  id: number
  slug: string
  createdAt: string | null
}

export interface PresellV2ListResponse {
  items: PresellV2Summary[]
}

export interface PresellV2Detail {
  id: number
  slug: string
  affiliateUrl: string
  sections: Section[]
  renderedHtml: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type AnalyzeJobV2Status =
  | { status: 'extracting' | 'analyzing'; message: string }
  | { status: 'done'; message: string; result: { sections: Section[] } }
  | { status: 'failed'; message: string; error: string; errorCode?: string }

export class AnalyzeJobV2ExpiredError extends Error {
  constructor() {
    super('A análise expirou. Tente novamente.')
    this.name = 'AnalyzeJobV2ExpiredError'
  }
}

export function listPresellsV2() {
  return apiClient.get<PresellV2ListResponse>(adminApiPaths.presellsV2)
}

export function startAnalyzeUrlV2(payload: { url: string; affiliateUrl: string }) {
  return apiClient.post<{ jobId: string }>(adminApiPaths.analyzeUrlV2, {
    body: payload,
  })
}

export async function pollAnalyzeJobV2(jobId: string): Promise<AnalyzeJobV2Status> {
  try {
    return await apiClient.get<AnalyzeJobV2Status>(
      `${adminApiPaths.analyzeUrlV2}/${jobId}`,
    )
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      throw new AnalyzeJobV2ExpiredError()
    }
    throw err
  }
}

export interface CreatePresellV2Payload {
  slug: string
  affiliateUrl: string
  sections: Section[]
}

export function createPresellV2(payload: CreatePresellV2Payload) {
  return apiClient.post<PresellV2Detail>(adminApiPaths.presellsV2, {
    body: payload as unknown as Record<string, unknown>,
  })
}
