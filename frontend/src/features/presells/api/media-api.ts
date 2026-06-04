import { apiClient } from '@/lib/api/api-client.ts'

export interface MediaImage {
  url: string
  filename: string
  size: number
  createdAt: string
}

export async function listMediaImages(): Promise<MediaImage[]> {
  const data = await apiClient.get<{ images: MediaImage[] }>('/admin/media')
  return data.images
}

export async function checkMediaUsage(filename: string): Promise<{ usedBy: string[] }> {
  return apiClient.delete<{ usedBy: string[] }>(`/admin/media/${encodeURIComponent(filename)}?check=true`)
}

export async function deleteMediaImage(filename: string): Promise<void> {
  await apiClient.delete<unknown>(`/admin/media/${encodeURIComponent(filename)}`)
}
