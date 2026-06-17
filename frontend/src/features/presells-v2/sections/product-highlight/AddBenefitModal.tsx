import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { ModalShell } from '@/features/presells-v2/components/ModalShell.tsx'
import type { BenefitItem } from '../types.ts'

type AddBenefitModalProps = {
  onCancel: () => void
  onConfirm: (item: BenefitItem) => void
}

export function AddBenefitModal({ onCancel, onConfirm }: AddBenefitModalProps) {
  const [icon, setIcon] = useState('✅')
  const [text, setText] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm({ icon: icon.trim() || '✅', text: text.trim() })
  }

  const canSubmit = text.trim().length > 0

  return (
    <ModalShell title="Adicionar benefício" onCancel={onCancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="benefit-icon">Ícone (emoji)</Label>
          <Input id="benefit-icon" value={icon} onChange={(e) => setIcon(e.target.value)} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="benefit-text">Texto</Label>
          <Input id="benefit-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={!canSubmit}>Adicionar</Button>
        </div>
      </form>
    </ModalShell>
  )
}
