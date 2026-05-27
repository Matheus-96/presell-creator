import { apiClient } from '@/lib/api/api-client.ts'

export type AdminContract = {
  name: string
  version: string
  basePath: string
  auth: {
    strategy: string
    csrf: {
      header: string
      body: string[]
    }
  }
  versioning: {
    strategy: string
    breakingChangePlan: string
  }
  pagination: {
    type: string
    defaultLimit: number
    maxLimit: number
    cursorEncoding: string
  }
  endpoints: Array<{
    operationId: string
    method: string
    path: string
    auth: string
    csrf?: string
    note?: string
    request?: string
    response?: string
  }>
}

export function getContracts() {
  return apiClient.get<AdminContract>('/admin/contracts')
}
