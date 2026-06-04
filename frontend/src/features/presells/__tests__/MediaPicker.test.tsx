import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MediaPicker } from '@/features/presells/components/MediaPicker.tsx'
import type { MediaReference } from '@/features/presells/types.ts'
import type { MediaImage } from '@/features/presells/api/media-api.ts'

vi.mock('@/features/presells/api/media-api.ts', () => ({
  listMediaImages: vi.fn(),
  checkMediaUsage: vi.fn(),
  deleteMediaImage: vi.fn(),
}))

vi.mock('@/features/presells/lib/presells-api.ts', () => ({
  uploadMedia: vi.fn(),
}))

import { listMediaImages, checkMediaUsage, deleteMediaImage } from '@/features/presells/api/media-api.ts'
import { uploadMedia } from '@/features/presells/lib/presells-api.ts'

const mockListMediaImages = vi.mocked(listMediaImages)
const mockCheckMediaUsage = vi.mocked(checkMediaUsage)
const mockDeleteMediaImage = vi.mocked(deleteMediaImage)
const mockUploadMedia = vi.mocked(uploadMedia)

const fakeImage: MediaImage = {
  url: '/media/foo.jpg',
  filename: 'foo.jpg',
  size: 12345,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const fakeRef: MediaReference = {
  fileName: 'foo.jpg',
  originalName: 'foo.jpg',
  mimeType: 'image/jpeg',
  size: 12345,
  url: '/media/foo.jpg',
}

describe('MediaPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Selecionar imagem" button when value is null', () => {
    render(<MediaPicker label="Hero Image" value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /selecionar imagem/i })).toBeDefined()
  })

  it('shows image preview when value is set', () => {
    render(<MediaPicker label="Hero Image" value={fakeRef} onChange={vi.fn()} />)
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toContain('foo.jpg')
    expect(screen.getByRole('button', { name: /trocar/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /remover/i })).toBeDefined()
  })

  it('opens gallery and loads images on button click', async () => {
    mockListMediaImages.mockResolvedValue([fakeImage])

    render(<MediaPicker label="Hero Image" value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /selecionar imagem/i }))

    await waitFor(() => {
      expect(screen.getByText('Galeria de Imagens')).toBeDefined()
      expect(mockListMediaImages).toHaveBeenCalledOnce()
    })
    // gallery shows the image
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })

  it('calls onChange with selected image and closes gallery', async () => {
    mockListMediaImages.mockResolvedValue([fakeImage])
    const onChange = vi.fn()

    render(<MediaPicker label="Hero Image" value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /selecionar imagem/i }))

    await waitFor(() => expect(screen.getByText('Galeria de Imagens')).toBeDefined())

    // click the gallery image button
    const galleryBtn = screen.getByRole('button', { name: /foo\.jpg/i })
    await userEvent.click(galleryBtn)

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'foo.jpg', url: '/media/foo.jpg' }),
    )
    // gallery closes
    expect(screen.queryByText('Galeria de Imagens')).toBeNull()
  })

  it('calls onChange(null) when remove button clicked', async () => {
    const onChange = vi.fn()
    render(<MediaPicker label="Hero Image" value={fakeRef} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows error when gallery load fails', async () => {
    mockListMediaImages.mockRejectedValue(new Error('network error'))

    render(<MediaPicker label="Hero Image" value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /selecionar imagem/i }))

    await waitFor(() => {
      expect(screen.getByText(/falha ao carregar galeria/i)).toBeDefined()
    })
  })

  describe('handleDeleteClick', () => {
    async function openGalleryWithImage() {
      mockListMediaImages.mockResolvedValue([fakeImage])
      render(<MediaPicker label="Hero Image" value={null} onChange={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /selecionar imagem/i }))
      await waitFor(() => expect(screen.getByText('Galeria de Imagens')).toBeDefined())

      const imageWrapper = screen.getByRole('button', { name: /foo\.jpg/i }).parentElement!
      await userEvent.hover(imageWrapper)
      return imageWrapper
    }

    it('deletes directly and removes image from grid when usedBy is empty', async () => {
      mockCheckMediaUsage.mockResolvedValue({ usedBy: [] })
      mockDeleteMediaImage.mockResolvedValue(undefined)

      const wrapper = await openGalleryWithImage()
      const trashBtn = wrapper.querySelector('button[aria-label^="Excluir"]') as HTMLButtonElement
      await userEvent.click(trashBtn)

      await waitFor(() => {
        expect(mockDeleteMediaImage).toHaveBeenCalledWith('foo.jpg')
        expect(screen.queryByText('Confirmar exclusão')).toBeNull()
        expect(screen.queryByRole('button', { name: /foo\.jpg/i })).toBeNull()
      })
    })

    it('shows confirmation modal when image is used by presells', async () => {
      mockCheckMediaUsage.mockResolvedValue({ usedBy: ['slug-1'] })

      const wrapper = await openGalleryWithImage()
      const trashBtn = wrapper.querySelector('button[aria-label^="Excluir"]') as HTMLButtonElement
      await userEvent.click(trashBtn)

      await waitFor(() => {
        expect(screen.getByText('Confirmar exclusão')).toBeDefined()
        expect(mockDeleteMediaImage).not.toHaveBeenCalled()
      })
    })

    it('shows error message when direct delete fails', async () => {
      mockCheckMediaUsage.mockResolvedValue({ usedBy: [] })
      mockDeleteMediaImage.mockRejectedValue(new Error('server error'))

      const wrapper = await openGalleryWithImage()
      const trashBtn = wrapper.querySelector('button[aria-label^="Excluir"]') as HTMLButtonElement
      await userEvent.click(trashBtn)

      await waitFor(() => {
        expect(screen.getByText(/falha ao excluir imagem/i)).toBeDefined()
      })
    })
  })

  it('uploads file, refreshes gallery, and calls onChange', async () => {
    const uploadResult = { media: fakeRef }
    mockUploadMedia.mockResolvedValue(uploadResult)
    mockListMediaImages.mockResolvedValue([fakeImage])
    const onChange = vi.fn()

    render(<MediaPicker label="Hero Image" value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /selecionar imagem/i }))
    await waitFor(() => expect(screen.getByText('Galeria de Imagens')).toBeDefined())

    const file = new File(['img'], 'bar.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    await waitFor(() => {
      expect(mockUploadMedia).toHaveBeenCalledWith(file)
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/media/foo.jpg' }),
      )
    })
  })
})
