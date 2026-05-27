import { apiClient } from '@/lib/api/api-client.ts'
import type { TemplateCatalogResponse } from '@/features/presells/types.ts'

export function listTemplates() {
  return apiClient.get<TemplateCatalogResponse>('/admin/templates')
}
