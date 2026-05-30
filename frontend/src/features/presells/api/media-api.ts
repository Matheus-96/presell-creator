export interface MediaImage {
  url: string
  filename: string
  size: number
  createdAt: string
}

export async function listMediaImages(): Promise<MediaImage[]> {
  const res = await fetch('/api/admin/media', { credentials: 'include' })
  if (!res.ok) throw new Error('Falha ao carregar galeria de imagens')
  const data = (await res.json()) as { images: MediaImage[] }
  return data.images
}
