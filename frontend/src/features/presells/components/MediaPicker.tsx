import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { uploadMedia } from '../lib/presells-api.ts'
import { listMediaImages, type MediaImage } from '../api/media-api.ts'
import type { MediaReference } from '../types.ts'

interface MediaPickerProps {
  label: string
  value: MediaReference | null
  onChange: (reference: MediaReference | null) => void
  isLoading?: boolean
}

export function MediaPicker({ label, value, onChange, isLoading }: MediaPickerProps) {
  const [images, setImages] = useState<MediaImage[]>([])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadGallery() {
    setLoadingGallery(true)
    setError(null)
    try {
      const imgs = await listMediaImages()
      setImages(imgs)
    } catch {
      setError('Falha ao carregar galeria')
    } finally {
      setLoadingGallery(false)
    }
  }

  function openGallery() {
    setGalleryOpen(true)
    loadGallery()
  }

  function handleSelect(img: MediaImage) {
    onChange({
      fileName: img.filename,
      originalName: img.filename,
      mimeType: null,
      size: img.size,
      url: img.url,
    })
    setGalleryOpen(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadMedia(file)
      const imgs = await listMediaImages()
      setImages(imgs)
      onChange({
        fileName: result.media.fileName,
        originalName: result.media.originalName ?? file.name,
        mimeType: file.type,
        size: file.size,
        url: result.media.url,
      })
    } catch {
      setError('Falha ao enviar imagem')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-2)' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--p-text)' }}>
        {label}
      </label>

      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-3)' }}>
          <img
            src={value.url}
            alt={value.originalName ?? ''}
            style={{
              width: 80,
              height: 60,
              objectFit: 'cover',
              borderRadius: 'var(--p-radius-sm)',
              border: '1px solid rgba(148,163,184,0.3)',
            }}
          />
          <div
            style={{
              flex: 1,
              fontSize: '0.8rem',
              color: 'var(--p-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value.originalName ?? value.fileName}
          </div>
          <Button size="sm" variant="outline" onClick={openGallery} disabled={isLoading}>
            Trocar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onChange(null)} disabled={isLoading}>
            Remover
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={openGallery} disabled={isLoading}>
          Selecionar imagem
        </Button>
      )}

      {galleryOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--p-space-4)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGalleryOpen(false)
          }}
        >
          <div
            style={{
              background: 'var(--p-panel)',
              borderRadius: 'var(--p-radius-md)',
              padding: 'var(--p-space-6)',
              width: '100%',
              maxWidth: 720,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--p-space-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                Galeria de Imagens
              </h3>
              <div style={{ display: 'flex', gap: 'var(--p-space-2)' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  <Button asChild size="sm" variant="outline" disabled={uploading}>
                    <span>{uploading ? 'Enviando…' : '+ Upload'}</span>
                  </Button>
                </label>
                <Button size="sm" variant="outline" onClick={() => setGalleryOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--p-danger)', fontSize: '0.875rem', margin: 0 }}>
                {error}
              </p>
            )}

            {loadingGallery ? (
              <p style={{ color: 'var(--p-muted)', textAlign: 'center' }}>Carregando…</p>
            ) : images.length === 0 ? (
              <p style={{ color: 'var(--p-muted)', textAlign: 'center' }}>
                Nenhuma imagem disponível. Faça upload de uma imagem.
              </p>
            ) : (
              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 'var(--p-space-3)',
                }}
              >
                {images.map((img) => (
                  <button
                    key={img.filename}
                    type="button"
                    aria-label={img.filename}
                    onClick={() => handleSelect(img)}
                    style={{
                      border:
                        value?.fileName === img.filename
                          ? '2px solid var(--p-accent)'
                          : '1px solid rgba(148,163,184,0.3)',
                      borderRadius: 'var(--p-radius-sm)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'none',
                      padding: 0,
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.filename}
                      style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
