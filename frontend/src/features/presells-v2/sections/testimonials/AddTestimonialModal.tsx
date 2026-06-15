import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { ModalShell } from '@/features/presells-v2/components/ModalShell.tsx'
import type { TestimonialItem } from '../types.ts'

type AddTestimonialModalProps = {
  onCancel: () => void
  onConfirm: (item: TestimonialItem) => void
}

export function AddTestimonialModal({ onCancel, onConfirm }: AddTestimonialModalProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [text, setText] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm({
      name: name.trim(),
      role: role.trim(),
      text: text.trim(),
      avatarUrl: null,
    })
  }

  const canSubmit = name.trim().length > 0 && text.trim().length > 0

  return (
    <ModalShell title="Adicionar depoimento" onCancel={onCancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-name">Nome</Label>
          <Input
            id="test-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-role">Cargo</Label>
          <Input
            id="test-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-text">Depoimento</Label>
          <Input
            id="test-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
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
