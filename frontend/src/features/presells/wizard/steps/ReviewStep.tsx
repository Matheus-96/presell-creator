import { useState } from 'react'

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

type PresellDraft = {
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
    <div>
      <input
        aria-label="Headline"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
      />
      <input
        aria-label="Subtitle"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
      />
      <textarea
        aria-label="Body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <textarea
        aria-label="Bullets"
        value={bulletsText}
        onChange={(e) => setBulletsText(e.target.value)}
      />
      <input
        aria-label="CTA Text"
        value={ctaText}
        onChange={(e) => setCtaText(e.target.value)}
      />
      <button type="button" onClick={handleSave}>
        Salvar como draft
      </button>
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
    <div>
      <div role="tablist">
        {variants.map((v, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={activeTab === i}
            type="button"
            onClick={() => setActiveTab(i)}
          >
            {v.angle}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <p>{activeVariant.headline}</p>
        <p>{activeVariant.subtitle}</p>
        <p>{activeVariant.body}</p>
        <p>{activeVariant.ctaText}</p>
        <label>
          <input
            type="checkbox"
            checked={selected[activeTab]}
            onChange={() => toggleSelected(activeTab)}
          />
          Salvar esta variante
        </label>
      </div>
      <button type="button" onClick={handleSave} disabled={noneSelected}>
        Salvar selecionadas
      </button>
    </div>
  )
}

export function ReviewStep({ jobResult, onSave }: ReviewStepProps) {
  if (isSingleVariant(jobResult)) {
    return <SingleVariantView variant={jobResult} onSave={onSave} />
  }
  return <MultiVariantView variants={jobResult.variants} onSave={onSave} />
}
