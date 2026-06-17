import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Field } from '@/features/presells-v2/components/Field.tsx'
import { MediaPicker } from '@/features/presells/components/MediaPicker.tsx'
import type { HeroProps, HeroVariant } from '../types.ts'

type HeroEditorProps = {
  props: HeroProps
  onChange: (patch: Partial<HeroProps>) => void
}

const VARIANTS: { value: HeroVariant; label: string }[] = [
  { value: 'centered', label: 'Centralizado' },
  { value: 'split', label: 'Dividido (imagem + texto)' },
  { value: 'background-image', label: 'Imagem de fundo' },
]

export function HeroEditor({ props, onChange }: HeroEditorProps) {
  const variant = props.variant || 'centered'
  const showImage = variant === 'split' || variant === 'background-image'
  const showPosition = variant === 'split'
  const showBgColor = variant !== 'background-image'

  return (
    <SectionCard eyebrow="Seção" title="Hero">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-hero-variant">Layout</Label>
          <select
            id="v2-hero-variant"
            value={variant}
            onChange={(e) => onChange({ variant: e.target.value as HeroVariant })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {VARIANTS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <Field id="v2-hero-headline" label="Headline" value={props.headline} onChange={(v) => onChange({ headline: v })} />
        <Field id="v2-hero-subtitle" label="Subtítulo" value={props.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        <Field id="v2-hero-cta-text" label="Texto do CTA" value={props.ctaText} onChange={(v) => onChange({ ctaText: v })} />
        <Field id="v2-hero-cta-url" label="URL de afiliado" value={props.ctaUrl} onChange={(v) => onChange({ ctaUrl: v })} />
        {showImage && (
          <MediaPicker
            label={variant === 'background-image' ? 'Imagem de fundo' : 'Imagem'}
            purpose={variant === 'background-image' ? 'background' : 'product'}
            value={props.imageUrl ? { fileName: '', originalName: null, mimeType: null, size: null, url: props.imageUrl } : null}
            onChange={(ref) => onChange({ imageUrl: ref?.url ?? null })}
          />
        )}
        {showPosition && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v2-hero-img-pos">Posição da imagem</Label>
            <select
              id="v2-hero-img-pos"
              value={props.imagePosition || 'right'}
              onChange={(e) => onChange({ imagePosition: e.target.value as 'left' | 'right' })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="right">Direita</option>
              <option value="left">Esquerda</option>
            </select>
          </div>
        )}
        {showBgColor && (
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
        )}
      </div>
    </SectionCard>
  )
}
