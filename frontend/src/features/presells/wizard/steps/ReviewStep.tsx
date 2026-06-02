import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { cn } from '@/lib/utils.ts'

type SingleVariantResult = {
  templateId: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  heroImageUrl: string | null
  theme: object | null
  settings: Record<string, unknown>
}

type MultiVariantResult = {
  variants: Array<{ angle: string } & SingleVariantResult>
}

export type PresellDraft = {
  templateId: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  theme: object | null
  settings: Record<string, unknown>
}

interface ReviewStepProps {
  jobResult: SingleVariantResult | MultiVariantResult
  onSave: (presells: PresellDraft[]) => void
}

function isSingleVariant(
  result: SingleVariantResult | MultiVariantResult,
): result is SingleVariantResult {
  return 'templateId' in result
}

function SingleVariantView({
  variant,
  onSave,
}: {
  variant: SingleVariantResult
  onSave: (presells: PresellDraft[]) => void
}) {
  const [headline, setHeadline] = useState(variant.headline)
  const [subtitle, setSubtitle] = useState(variant.subtitle)
  const [body, setBody] = useState(variant.body)
  const [ctaText, setCtaText] = useState(variant.ctaText)
  const [bulletsText, setBulletsText] = useState(variant.bullets.join('\n'))

  function handleSave() {
    const draft: PresellDraft = {
      templateId: variant.templateId,
      headline,
      subtitle,
      body,
      bullets: bulletsText.split('\n').filter((b) => b.trim() !== ''),
      ctaText,
      theme: variant.theme,
      settings: variant.settings,
    }
    onSave([draft])
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-headline">Headline</Label>
        <Input
          id="review-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          aria-label="Headline"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-subtitle">Subtitle</Label>
        <Input
          id="review-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          aria-label="Subtitle"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-body">Body</Label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Body"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-bullets">Bullets (uma por linha)</Label>
        <textarea
          id="review-bullets"
          value={bulletsText}
          onChange={(e) => setBulletsText(e.target.value)}
          aria-label="Bullets"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-cta">CTA Text</Label>
        <Input
          id="review-cta"
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          aria-label="CTA Text"
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave}>
          Salvar como draft
        </Button>
      </div>
    </div>
  )
}

function MultiVariantView({
  variants,
  onSave,
}: {
  variants: Array<{ angle: string } & SingleVariantResult>
  onSave: (presells: PresellDraft[]) => void
}) {
  const [activeTab, setActiveTab] = useState(0)
  const [selected, setSelected] = useState<boolean[]>(variants.map(() => false))

  function toggleSelected(index: number) {
    setSelected((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  function handleSave() {
    const drafts = variants
      .filter((_, i) => selected[i])
      .map((v) => ({
        templateId: v.templateId,
        headline: v.headline,
        subtitle: v.subtitle,
        body: v.body,
        bullets: v.bullets,
        ctaText: v.ctaText,
        theme: v.theme,
        settings: v.settings,
      }))
    onSave(drafts)
  }

  const noneSelected = selected.every((v) => !v)
  const activeVariant = variants[activeTab]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {variants.map((v, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={activeTab === i}
            type="button"
            onClick={() => setActiveTab(i)}
            className={cn(
              'px-3 py-2 rounded-t-md font-medium text-sm transition-colors border-b-2',
              activeTab === i
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {v.angle}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div role="tabpanel" className="space-y-3 pt-2">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Prévia:</p>
          <div className="space-y-1 text-sm">
            <p className="font-bold text-slate-800">{activeVariant.headline}</p>
            <p className="text-slate-600">{activeVariant.subtitle}</p>
            <p className="text-slate-600 text-xs mt-2">{activeVariant.body}</p>
            <p className="font-semibold text-slate-700 mt-2 text-xs">{activeVariant.ctaText}</p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selected[activeTab]}
            onChange={() => toggleSelected(activeTab)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">Salvar esta variante</span>
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={noneSelected}>
          Salvar selecionadas
        </Button>
      </div>
    </div>
  )
}

export function ReviewStep({ jobResult, onSave }: ReviewStepProps) {
  return (
    <div className="section-card flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Revisar e editar</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ajuste os textos conforme necessário e salve como draft.
        </p>
      </div>

      <div className="max-h-[calc(100vh-480px)] overflow-y-auto rounded-lg border border-slate-200 p-4 bg-white">
        {isSingleVariant(jobResult) ? (
          <SingleVariantView variant={jobResult} onSave={onSave} />
        ) : (
          <MultiVariantView variants={jobResult.variants} onSave={onSave} />
        )}
      </div>
    </div>
  )
}
