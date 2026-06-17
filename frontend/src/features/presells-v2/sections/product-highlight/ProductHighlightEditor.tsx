import { useState } from 'react'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Field } from '@/features/presells-v2/components/Field.tsx'
import { ConfirmRemoveModal } from '@/features/presells-v2/components/ConfirmRemoveModal.tsx'
import { MediaPicker } from '@/features/presells/components/MediaPicker.tsx'
import type { BenefitItem, ProductHighlightProps, ProductHighlightVariant } from '../types.ts'
import { AddBenefitModal } from './AddBenefitModal.tsx'

type Props = {
  props: ProductHighlightProps
  onChange: (patch: Partial<ProductHighlightProps>) => void
}

const VARIANTS: { value: ProductHighlightVariant; label: string }[] = [
  { value: 'single-product', label: 'Produto único' },
  { value: 'benefits-list', label: 'Lista de benefícios' },
]

export function ProductHighlightEditor({ props, onChange }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const isSingle = props.variant === 'single-product'

  return (
    <SectionCard eyebrow="Seção" title="Destaque de Produto">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-ph-variant">Layout</Label>
          <select
            id="v2-ph-variant"
            value={props.variant}
            onChange={(e) => onChange({ variant: e.target.value as ProductHighlightVariant })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {VARIANTS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {isSingle ? (
          <>
            <MediaPicker
              label="Imagem do produto"
              purpose="product"
              value={props.imageUrl ? { fileName: '', originalName: null, mimeType: null, size: null, url: props.imageUrl } : null}
              onChange={(ref) => onChange({ imageUrl: ref?.url ?? null })}
            />
            <Field id="v2-ph-name" label="Nome" value={props.name || ''} onChange={(v) => onChange({ name: v })} />
            <Field id="v2-ph-desc" label="Descrição" value={props.description || ''} onChange={(v) => onChange({ description: v })} />
            <Field id="v2-ph-orig-price" label="Preço original (de)" value={props.originalPrice || ''} onChange={(v) => onChange({ originalPrice: v })} />
            <Field id="v2-ph-price" label="Preço (por)" value={props.price || ''} onChange={(v) => onChange({ price: v })} />
            <Field id="v2-ph-badge" label="Badge de desconto" value={props.discountBadge || ''} onChange={(v) => onChange({ discountBadge: v })} />
            <Field id="v2-ph-cta" label="Texto do CTA" value={props.ctaText || ''} onChange={(v) => onChange({ ctaText: v })} />
            <Field id="v2-ph-cta-url" label="URL do CTA" value={props.ctaUrl || ''} onChange={(v) => onChange({ ctaUrl: v })} />
          </>
        ) : (
          <>
            <Field id="v2-ph-title" label="Título" value={props.title || ''} onChange={(v) => onChange({ title: v })} />
            <div className="flex flex-col gap-2">
              <Label>Benefícios</Label>
              {(props.items || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{item.icon}</span>
                  <span className="flex-1 truncate">{item.text}</span>
                  <Button type="button" variant="outline" size="sm" aria-label="Remover benefício" onClick={() => setRemoveIndex(i)}>
                    Remover
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                Adicionar benefício
              </Button>
            </div>
          </>
        )}
      </div>

      {addOpen && (
        <AddBenefitModal
          onConfirm={(item: BenefitItem) => { onChange({ items: [...(props.items || []), item] }); setAddOpen(false) }}
          onCancel={() => setAddOpen(false)}
        />
      )}
      {removeIndex !== null && (
        <ConfirmRemoveModal
          message="Tem certeza que deseja remover este benefício?"
          onConfirm={() => { onChange({ items: (props.items || []).filter((_, i) => i !== removeIndex) }); setRemoveIndex(null) }}
          onCancel={() => setRemoveIndex(null)}
        />
      )}
    </SectionCard>
  )
}
