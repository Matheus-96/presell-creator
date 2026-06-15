import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Field } from '@/features/presells-v2/components/Field.tsx'
import type { HeroProps } from '../types.ts'

type HeroEditorProps = {
  props: HeroProps
  onChange: (patch: Partial<HeroProps>) => void
}

export function HeroEditor({ props, onChange }: HeroEditorProps) {
  return (
    <SectionCard eyebrow="Seção" title="Hero">
      <div className="flex flex-col gap-3">
        <Field
          id="v2-hero-headline"
          label="Headline"
          value={props.headline}
          onChange={(v) => onChange({ headline: v })}
        />
        <Field
          id="v2-hero-subtitle"
          label="Subtítulo"
          value={props.subtitle}
          onChange={(v) => onChange({ subtitle: v })}
        />
        <Field
          id="v2-hero-cta-text"
          label="Texto do CTA"
          value={props.ctaText}
          onChange={(v) => onChange({ ctaText: v })}
        />
        <Field
          id="v2-hero-cta-url"
          label="URL de afiliado"
          value={props.ctaUrl}
          onChange={(v) => onChange({ ctaUrl: v })}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-hero-bg">Cor de fundo</Label>
          <div className="flex items-center gap-2">
            <input
              id="v2-hero-bg-picker"
              type="color"
              aria-label="Selecionar cor de fundo"
              value={props.bgColor || '#ffffff'}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-10 w-12 cursor-pointer rounded border border-input"
            />
            <Input
              id="v2-hero-bg"
              value={props.bgColor || ''}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
