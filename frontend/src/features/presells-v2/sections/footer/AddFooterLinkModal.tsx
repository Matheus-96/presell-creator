import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { ModalShell } from '@/features/presells-v2/components/ModalShell.tsx'
import type { FooterLink } from '../types.ts'

type AddFooterLinkModalProps = {
  onCancel: () => void
  onConfirm: (link: FooterLink) => void
}

export function AddFooterLinkModal({ onCancel, onConfirm }: AddFooterLinkModalProps) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm({ label: label.trim(), url: url.trim() })
  }

  const canSubmit = label.trim().length > 0 && url.trim().length > 0

  return (
    <ModalShell title="Adicionar link" onCancel={onCancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link-label">Rótulo</Label>
          <Input
            id="link-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Adicionar
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
