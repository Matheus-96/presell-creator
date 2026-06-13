import { apiClient } from '@/lib/api/api-client.ts'

const adminApiPaths = {
  presellsV2: '/admin/presells-v2',
} as const

export interface PresellV2Summary {
  id: number
  slug: string
  createdAt: string | null
}

export interface PresellV2ListResponse {
  items: PresellV2Summary[]
}

export function listPresellsV2() {
  return apiClient.get<PresellV2ListResponse>(adminApiPaths.presellsV2)
}
