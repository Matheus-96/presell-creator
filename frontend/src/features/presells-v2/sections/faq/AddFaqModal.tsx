import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { ModalShell } from '@/features/presells-v2/components/ModalShell.tsx'
import type { FaqItem } from '../types.ts'

type AddFaqModalProps = {
  onCancel: () => void
  onConfirm: (item: FaqItem) => void
}

export function AddFaqModal({ onCancel, onConfirm }: AddFaqModalProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm({ question: question.trim(), answer: answer.trim() })
  }

  const canSubmit = question.trim().length > 0 && answer.trim().length > 0

  return (
    <ModalShell title="Adicionar pergunta" onCancel={onCancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="faq-question">Pergunta</Label>
          <Input
            id="faq-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="faq-answer">Resposta</Label>
          <Input
            id="faq-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
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
