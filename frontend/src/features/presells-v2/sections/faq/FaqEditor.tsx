import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ConfirmRemoveModal } from '@/features/presells-v2/components/ConfirmRemoveModal.tsx'
import { Field } from '@/features/presells-v2/components/Field.tsx'
import type { FaqItem, FaqProps } from '../types.ts'
import { AddFaqModal } from './AddFaqModal.tsx'

type FaqEditorProps = {
  props: FaqProps
  onChange: (patch: Partial<FaqProps>) => void
}

export function FaqEditor({ props, onChange }: FaqEditorProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  function handleAdd(item: FaqItem) {
    onChange({ items: [...(props.items || []), item] })
    setAddOpen(false)
  }

  function handleConfirmRemove() {
    if (removeIndex === null) return
    const next = (props.items || []).filter((_, i) => i !== removeIndex)
    onChange({ items: next })
    setRemoveIndex(null)
  }

  return (
    <SectionCard eyebrow="Seção" title="FAQ">
      <div className="flex flex-col gap-3">
        <Field
          id="v2-faq-title"
          label="Título"
          value={props.title}
          onChange={(v) => onChange({ title: v })}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Perguntas</span>
          <ul className="flex flex-col gap-2">
            {(props.items || []).map((item, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {item.question}
                  </p>
                  <p className="text-xs text-slate-600">{item.answer}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remover pergunta"
                  onClick={() => setRemoveIndex(idx)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            Adicionar pergunta
          </Button>
        </div>
      </div>

      {addOpen && (
        <AddFaqModal onCancel={() => setAddOpen(false)} onConfirm={handleAdd} />
      )}
      {removeIndex !== null && (
        <ConfirmRemoveModal
          message="Tem certeza que deseja remover esta pergunta?"
          onCancel={() => setRemoveIndex(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </SectionCard>
  )
}
