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
