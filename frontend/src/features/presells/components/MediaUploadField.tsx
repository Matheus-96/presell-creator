import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button.tsx'
import { Label } from '@/components/ui/label.tsx'
import { uploadMedia } from '@/features/presells/lib/presells-api.ts'
import type { MediaReference } from '@/features/presells/types.ts'

type MediaUploadFieldProps = {
  label: string
  description?: string
  accept?: string
  reference: MediaReference | null
  onUpload: (reference: MediaReference) => void
  onRemove: () => void
}

export function MediaUploadField({
  label,
  description,
  accept = 'image/*',
  reference,
  onUpload,
  onRemove,
}: MediaUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadMedia(file)
      onUpload(result.media)
    } catch {
      toast.error('Falha ao enviar imagem. Tente novamente.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      {reference ? (
        <div className="flex items-start gap-3 rounded-md border border-input bg-muted/30 p-3">
          <img
            src={reference.url}
            alt=""
            className="h-16 w-16 rounded object-cover shrink-0 bg-slate-100"
          />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {reference.originalName ?? reference.fileName}
            </p>
            {reference.size ? (
              <p className="text-xs text-muted-foreground">{formatFileSize(reference.size)}</p>
            ) : null}
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? 'Enviando…' : 'Trocar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={onRemove}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/20 px-4 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
        >
          {uploading ? (
            'Enviando…'
          ) : (
            <>
              <span className="text-base">+</span>
              <span>Escolher arquivo</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
