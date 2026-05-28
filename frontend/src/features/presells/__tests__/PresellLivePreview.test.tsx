import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PresellLivePreview } from '@/features/presells/components/PresellLivePreview.tsx'
import type { PresellFormState, TemplateMetadata } from '@/features/presells/types.ts'
import '@/features/presells/templates/index.ts'

function makeDraft(overrides = {}): PresellFormState {
  return {
    id: 1,
    slug: 'test-slug',
    templateId: 'offer-modal',
    title: 'Test',
    headline: 'Meu Headline',
    subtitle: 'Subtitle',
    body: 'Body',
    bulletsText: 'Benefício 1\nBenefício 2',
    ctaText: 'Comprar',
    affiliateUrl: 'https://example.com',
    googlePixelId: '',
    settings: {},
    status: 'draft',
    media: {
      heroImageFileName: '',
      initialHeroImageFileName: '',
      heroImageReference: null,
      backgroundImageFileName: '',
      initialBackgroundImageFileName: '',
      backgroundImageReference: null,
    },
    urls: null,
    timestamps: { createdAt: null, updatedAt: null },
    ...overrides,
  }
}

function makeTemplate(overrides = {}): TemplateMetadata {
  return {
    id: 'offer-modal',
    name: 'Oferta com modal',
    description: '',
    fields: [],
    ...overrides,
  }
}

describe('PresellLivePreview', () => {
  it('shows placeholder when draft is null', () => {
    render(
      <PresellLivePreview
        draft={null}
        template={makeTemplate()}
        detailStatus="idle"
      />,
    )

    expect(screen.getByText(/selecione ou crie um presell/i)).toBeDefined()
  })

  it('shows placeholder when template is null', () => {
    render(
      <PresellLivePreview
        draft={makeDraft()}
        template={null}
        detailStatus="idle"
      />,
    )

    expect(screen.getByText(/escolha um template/i)).toBeDefined()
  })

  it('shows loading placeholder when detailStatus is loading', () => {
    render(
      <PresellLivePreview
        draft={makeDraft()}
        template={makeTemplate()}
        detailStatus="loading"
      />,
    )

    expect(screen.getByText(/carregando/i)).toBeDefined()
  })

  it('shows placeholder when template is not found in registry', () => {
    render(
      <PresellLivePreview
        draft={makeDraft({ templateId: 'template-inexistente' })}
        template={makeTemplate({ id: 'template-inexistente' })}
        detailStatus="idle"
      />,
    )

    expect(screen.getByText(/template não disponível/i)).toBeDefined()
  })

  it('renders template component with presell headline', () => {
    render(
      <PresellLivePreview
        draft={makeDraft({ headline: 'Meu Headline' })}
        template={makeTemplate()}
        detailStatus="idle"
      />,
    )

    expect(screen.getByText('Meu Headline')).toBeDefined()
  })
})
