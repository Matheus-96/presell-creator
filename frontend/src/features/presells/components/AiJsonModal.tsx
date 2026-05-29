import { useEffect, useRef, useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import { toast } from 'sonner'
import type { UseFormSetValue } from 'react-hook-form'
import { Button } from '@/components/ui/button.tsx'
import type { TemplateMetadata } from '@/features/presells/types.ts'
import type { PresellFormValues } from '@/features/presells/lib/presell-form-schema.ts'

type Props = {
  open: boolean
  onClose: () => void
  selectedTemplate: TemplateMetadata | null | undefined
  setValue: UseFormSetValue<PresellFormValues>
}

export function AiJsonModal({ open, onClose, selectedTemplate, setValue }: Props) {
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setJsonText('')
      setJsonError('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  function handleApply() {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      setJsonError('JSON inválido. Verifique o formato e tente novamente.')
      return
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setJsonError('O JSON deve ser um objeto.')
      return
    }

    if ('headline' in parsed && typeof parsed.headline === 'string') {
      setValue('headline', parsed.headline, { shouldDirty: true })
    }
    if ('subtitle' in parsed && typeof parsed.subtitle === 'string') {
      setValue('subtitle', parsed.subtitle, { shouldDirty: true })
    }
    if ('ctaText' in parsed && typeof parsed.ctaText === 'string') {
      setValue('ctaText', parsed.ctaText, { shouldDirty: true })
    }
    if ('bullets' in parsed && Array.isArray(parsed.bullets)) {
      const lines = (parsed.bullets as unknown[])
        .filter((b) => typeof b === 'string')
        .join('\n')
      setValue('bulletsText', lines, { shouldDirty: true })
    }
    if ('settings' in parsed && typeof parsed.settings === 'object' && parsed.settings !== null) {
      const knownFieldNames = new Set(selectedTemplate?.fields.map((f) => f.name) ?? [])
      const incoming = parsed.settings as Record<string, unknown>
      for (const key of Object.keys(incoming)) {
        if (knownFieldNames.has(key)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setValue(`settings.${key}` as any, incoming[key], { shouldDirty: true })
        }
      }
    }

    toast.success('Formulário preenchido com o JSON da IA')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Preencher com JSON da IA</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cole o JSON retornado pela IA. Os campos serão preenchidos automaticamente.
          </p>
        </div>
        <textarea
          ref={textareaRef}
          className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          placeholder={'{\n  "headline": "...",\n  "subtitle": "...",\n  "ctaText": "...",\n  "bullets": ["..."],\n  "settings": {}\n}'}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value)
            if (jsonError) setJsonError('')
          }}
        />
        {jsonError ? <p className="text-sm text-destructive">{jsonError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApply}
          >
            <ClipboardPaste className="h-4 w-4 mr-1.5" />
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  )
}
