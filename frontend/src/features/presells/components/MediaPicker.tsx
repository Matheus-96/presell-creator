import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { uploadMedia } from '../lib/presells-api.ts'
import { listMediaImages, checkMediaUsage, deleteMediaImage, type MediaImage } from '../api/media-api.ts'
import type { MediaReference } from '../types.ts'

interface MediaPickerProps {
  label: string
  value: MediaReference | null
  onChange: (reference: MediaReference | null) => void
  isLoading?: boolean
  purpose?: 'product' | 'background'
}

interface ConfirmDelete {
  image: MediaImage
  usedBy: string[]
}

export function MediaPicker({ label, value, onChange, isLoading, purpose }: MediaPickerProps) {
  const [images, setImages] = useState<MediaImage[]>([])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)
  const [checkingDelete, setCheckingDelete] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
      const result = await uploadMedia(file, purpose)
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

  async function handleDeleteClick(e: React.MouseEvent, img: MediaImage) {
    e.stopPropagation()
    setCheckingDelete(img.filename)
    try {
      const { usedBy } = await checkMediaUsage(img.filename)
      if (usedBy.length === 0) {
        await deleteMediaImage(img.filename)
        setImages((prev) => prev.filter((i) => i.filename !== img.filename))
      } else {
        setConfirmDelete({ image: img, usedBy })
      }
    } catch {
      setError('Falha ao excluir imagem')
    } finally {
      setCheckingDelete(null)
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteMediaImage(confirmDelete.image.filename)
      setImages((prev) => prev.filter((img) => img.filename !== confirmDelete.image.filename))
      setConfirmDelete(null)
    } catch {
      setDeleteError('Falha ao excluir imagem. Tente novamente.')
    } finally {
      setDeleting(false)
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
          <Button type="button" size="sm" variant="outline" onClick={openGallery} disabled={isLoading}>
            Trocar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange(null)} disabled={isLoading}>
            Remover
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={openGallery} disabled={isLoading}>
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
              width: '90vw',
              height: '90vh',
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
                flexShrink: 0,
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
                <Button type="button" size="sm" variant="outline" onClick={() => setGalleryOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--p-danger)', fontSize: '0.875rem', margin: 0, flexShrink: 0 }}>
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
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 'var(--p-space-3)',
                  alignContent: 'start',
                }}
              >
                {images.map((img) => (
                  <div
                    key={img.filename}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredImage(img.filename)}
                    onMouseLeave={() => setHoveredImage(null)}
                  >
                    <button
                      type="button"
                      aria-label={img.filename}
                      onClick={() => handleSelect(img)}
                      style={{
                        width: '100%',
                        border:
                          value?.fileName === img.filename
                            ? '2px solid var(--p-accent)'
                            : '1px solid rgba(148,163,184,0.3)',
                        borderRadius: 'var(--p-radius-sm)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'none',
                        padding: 0,
                        display: 'block',
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.filename}
                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </button>

                    {hoveredImage === img.filename && (
                      <button
                        type="button"
                        aria-label={`Excluir ${img.filename}`}
                        disabled={checkingDelete === img.filename}
                        onClick={(e) => handleDeleteClick(e, img)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--p-radius-sm)',
                          background: 'rgba(0,0,0,0.65)',
                          border: 'none',
                          cursor: checkingDelete === img.filename ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          padding: 0,
                        }}
                      >
                        {checkingDelete === img.filename
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={14} />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--p-space-4)',
          }}
        >
          <div
            style={{
              background: 'var(--p-panel)',
              borderRadius: 'var(--p-radius-md)',
              padding: 'var(--p-space-6)',
              width: '100%',
              maxWidth: 480,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--p-space-4)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Confirmar exclusão
            </h3>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--p-muted)', wordBreak: 'break-all' }}>
              <strong style={{ color: 'var(--p-text)' }}>{confirmDelete.image.filename}</strong>
            </p>

            {confirmDelete.usedBy.length > 0 ? (
              <div>
                <p style={{ margin: '0 0 var(--p-space-2)', fontSize: '0.875rem', color: 'var(--p-danger)' }}>
                  Esta imagem é usada pelas seguintes presells:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {confirmDelete.usedBy.map((slug) => (
                    <li key={slug} style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--p-text)' }}>
                      {slug}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: 'var(--p-space-2) 0 0', fontSize: '0.8rem', color: 'var(--p-muted)' }}>
                  Essas presells continuarão referenciando a imagem excluída (imagem quebrada).
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--p-muted)' }}>
                Nenhuma presell usa esta imagem.
              </p>
            )}

            {deleteError && (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--p-danger)' }}>
                {deleteError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--p-space-2)' }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? 'Excluindo…' : 'Excluir mesmo assim'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
