import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ConfirmRemoveModal } from '@/features/presells-v2/components/ConfirmRemoveModal.tsx'
import { Field } from '@/features/presells-v2/components/Field.tsx'
import type { FooterLink, FooterProps } from '../types.ts'
import { AddFooterLinkModal } from './AddFooterLinkModal.tsx'

type FooterEditorProps = {
  props: FooterProps
  onChange: (patch: Partial<FooterProps>) => void
}

export function FooterEditor({ props, onChange }: FooterEditorProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  function handleAdd(link: FooterLink) {
    onChange({ links: [...(props.links || []), link] })
    setAddOpen(false)
  }

  function handleConfirmRemove() {
    if (removeIndex === null) return
    const next = (props.links || []).filter((_, i) => i !== removeIndex)
    onChange({ links: next })
    setRemoveIndex(null)
  }

  return (
    <SectionCard eyebrow="Seção" title="Footer">
      <div className="flex flex-col gap-3">
        <Field
          id="v2-footer-legal"
          label="Texto legal"
          value={props.legalText}
          onChange={(v) => onChange({ legalText: v })}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Links</span>
          <ul className="flex flex-col gap-2">
            {(props.links || []).map((link, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {link.label}
                  </p>
                  <p className="text-xs text-slate-600">{link.url}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remover link"
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
            Adicionar link
          </Button>
        </div>
      </div>

      {addOpen && (
        <AddFooterLinkModal
          onCancel={() => setAddOpen(false)}
          onConfirm={handleAdd}
        />
      )}
      {removeIndex !== null && (
        <ConfirmRemoveModal
          message="Tem certeza que deseja remover este link?"
          onCancel={() => setRemoveIndex(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </SectionCard>
  )
}
