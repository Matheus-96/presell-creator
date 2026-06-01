import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PresellEditPage } from '@/features/presells/pages/PresellEditPage.tsx'
import type { PresellDetail, TemplateMetadata } from '@/features/presells/types.ts'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/features/presells/lib/presells-api.ts', () => ({
  listTemplates: vi.fn(),
  getPresell: vi.fn(),
  createPresell: vi.fn(),
  updatePresell: vi.fn(),
  deletePresell: vi.fn(),
  duplicatePresell: vi.fn(),
  uploadMedia: vi.fn(),
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { toast } from 'sonner'
import {
  listTemplates,
  getPresell,
  createPresell,
  updatePresell,
  deletePresell,
  duplicatePresell,
} from '@/features/presells/lib/presells-api.ts'

const mockListTemplates = vi.mocked(listTemplates)
const mockGetPresell = vi.mocked(getPresell)
const mockCreatePresell = vi.mocked(createPresell)
const mockUpdatePresell = vi.mocked(updatePresell)
const mockDeletePresell = vi.mocked(deletePresell)
const mockDuplicatePresell = vi.mocked(duplicatePresell)

function makeTemplate(overrides: Partial<TemplateMetadata> = {}): TemplateMetadata {
  return {
    id: 'offer-modal',
    name: 'Oferta com modal',
    description: 'Oferta central em modal',
    fields: [],
    ...overrides,
  }
}

function makePresellDetail(overrides: Partial<PresellDetail> = {}): PresellDetail {
  return {
    id: 1,
    slug: 'test-presell',
    status: 'draft',
    templateId: 'offer-modal',
    title: 'Test Presell',
    headline: 'Test Headline',
    subtitle: '',
    ctaText: 'Continuar',
    affiliateUrl: 'https://example.com',
    published: false,
    body: 'Body text',
    bullets: [],
    settings: {},
    media: { heroImage: null, backgroundImage: null },
    tracking: { googlePixelId: null, trackingParam: 'gclid' },
    timestamps: { createdAt: null, updatedAt: null },
    urls: {
      publicPage: '/p/test-presell',
      redirect: '/go/test-presell',
    },
    ...overrides,
  }
}

function renderPage(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const router = createMemoryRouter(
    [
      { path: '/presells', element: <div>List page</div> },
      { path: '/presells/new', element: <PresellEditPage /> },
      { path: '/presells/:id/edit', element: <PresellEditPage /> },
    ],
    { initialEntries: [route] },
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

/** Like renderPage but also returns the router so tests can trigger real navigation. */
function renderPageWithRouter(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const router = createMemoryRouter(
    [
      { path: '/presells', element: <div>List page</div> },
      { path: '/presells/new', element: <PresellEditPage /> },
      { path: '/presells/:id/edit', element: <PresellEditPage /> },
    ],
    { initialEntries: [route] },
  )

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...result, router }
}

describe('PresellEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows form loaded with presell data in edit mode at /presells/:id/edit', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7, slug: 'loaded-slug', title: 'Loaded Title' }))

    renderPage('/presells/7/edit')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salvar/i })).toBeDefined()
    })

    await userEvent.click(screen.getByText('Publicação'))
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe('loaded-slug')
  })

  it('calls createPresell and navigates to edit route after successful create', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockCreatePresell.mockResolvedValue(makePresellDetail({ id: 99 }))

    renderPage('/presells/new')

    await waitFor(() => expect(screen.getByRole('button', { name: /criar presell/i })).toBeDefined())

    await userEvent.click(screen.getByText('Conversão'))
    await userEvent.click(screen.getByText('Publicação'))
    await waitFor(() => expect(screen.getByLabelText(/slug/i)).toBeDefined())

    await userEvent.type(screen.getByLabelText(/slug/i), 'new-slug')
    await userEvent.type(screen.getByLabelText(/título interno/i), 'New Title')
    await userEvent.type(screen.getByLabelText(/^título$/i), 'New Headline')
    await userEvent.type(screen.getByLabelText(/texto do botão/i), 'Click here')
    await userEvent.type(screen.getByLabelText(/url de destino/i), 'https://example.com')

    await userEvent.click(screen.getByRole('button', { name: /criar presell/i }))

    await waitFor(() => {
      expect(mockCreatePresell).toHaveBeenCalledOnce()
      expect(mockNavigate).toHaveBeenCalledWith('/presells/99/edit')
    })
  })

  it('calls updatePresell and shows success toast after saving existing presell', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7, slug: 'existing-slug' }))
    mockUpdatePresell.mockResolvedValue(makePresellDetail({ id: 7, slug: 'existing-slug' }))

    renderPage('/presells/7/edit')

    await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => {
      expect(mockUpdatePresell).toHaveBeenCalledWith(7, expect.objectContaining({ slug: 'existing-slug' }))
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Presell salvo')
    })
  })

  it('calls deletePresell and navigates to /presells after deletion', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))
    mockDeletePresell.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage('/presells/7/edit')

    await waitFor(() => expect(screen.getByRole('button', { name: /excluir/i })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /excluir/i }))

    await waitFor(() => {
      expect(mockDeletePresell).toHaveBeenCalledWith(7)
      expect(mockNavigate).toHaveBeenCalledWith('/presells')
    })
  })

  it('calls duplicatePresell and navigates to the new edit route', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))
    mockDuplicatePresell.mockResolvedValue(makePresellDetail({ id: 42 }))

    renderPage('/presells/7/edit')

    await waitFor(() => expect(screen.getByRole('button', { name: /duplicar/i })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /duplicar/i }))

    await waitFor(() => {
      expect(mockDuplicatePresell).toHaveBeenCalledWith(7)
      expect(mockNavigate).toHaveBeenCalledWith('/presells/42/edit')
    })
  })

  it('shows empty form in create mode at /presells/new', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })

    renderPage('/presells/new')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /criar presell/i })).toBeDefined()
    })

    await userEvent.click(screen.getByText('Publicação'))
    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe('')
  })

  // Regression tests for Bug 2 — false-positive dirty state / "unsaved work" popup
  //
  // Previously, RHF's formState.isDirty could be true on mount because the deep
  // comparison of nested objects (settings, media) against defaultValues failed
  // due to object-reference changes after resolver normalisation, or after
  // switching templates. This caused the "Descartar alterações não salvas?"
  // blocker to fire even when the user had not touched the form.
  //
  // Fix: isDirty for navigation blocking is now derived from two reliable signals:
  //   1. formState.dirtyFields — per-field tracking, immune to object-reference
  //      issues that affect the overall isDirty comparison.
  //   2. userHasEdited ref — set to true only when setValueAndMarkEdited() is
  //      called (all controlled fields go through this wrapper).
  //
  // NOTE: The "Voltar" button calls navigate() from a MOCKED useNavigate, so it
  // bypasses React Router's useBlocker mechanism. To test the blocker, we trigger
  // navigation programmatically via the real router's navigate() method, which
  // does go through useBlocker.
  it('does NOT show unsaved-work confirmation when navigating away without editing', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))

    const confirmSpy = vi.spyOn(window, 'confirm')

    const { router } = renderPageWithRouter('/presells/7/edit')

    await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDefined())

    // Trigger real router navigation — this goes through useBlocker.
    // Must be in act() so React can flush state updates triggered by navigation.
    await act(async () => {
      await router.navigate('/presells')
    })

    // The navigation blocker must NOT have asked for confirmation
    expect(confirmSpy).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('DOES show unsaved-work confirmation after the user edits a field', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7, slug: 'original-slug' }))

    // Return false so navigation is cancelled — we only care that the dialog was shown
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { router } = renderPageWithRouter('/presells/7/edit')

    await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDefined())

    await userEvent.click(screen.getByText('Publicação'))

    // Actually change a registered field — this populates formState.dirtyFields
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, 'changed-slug')

    // Wait for the field to show the new value (ensures React state settled)
    await waitFor(() => {
      expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toContain('changed-slug')
    })

    // Trigger real router navigation — this goes through useBlocker.
    // Must be in act() so React can flush state updates triggered by navigation.
    await act(async () => {
      await router.navigate('/presells')
    })

    expect(confirmSpy).toHaveBeenCalledWith('Descartar alterações não salvas?')

    confirmSpy.mockRestore()
  })

  // Issue #121 — AnalyzeUrlSection collapsed by default in edit mode
  describe('Re-analisar section (collapsed by default)', () => {
    it('does NOT show the AnalyzeUrlSection URL input before expanding', async () => {
      mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
      mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))

      renderPage('/presells/7/edit')

      await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDefined())

      // The URL input inside AnalyzeUrlSection should not be visible without interaction
      const urlInput = screen.queryByPlaceholderText('https://exemplo.com/produto')
      expect(urlInput).toBeNull()
    })

    it('shows the section title "Re-analisar a partir de uma URL"', async () => {
      mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
      mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))

      renderPage('/presells/7/edit')

      await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDefined())

      expect(screen.getByText('Re-analisar a partir de uma URL')).toBeDefined()
    })

    it('shows the AnalyzeUrlSection URL input after clicking the section header', async () => {
      mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
      mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))

      renderPage('/presells/7/edit')

      await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDefined())

      // Click the collapsed section header to expand it
      await userEvent.click(screen.getByText('Re-analisar a partir de uma URL'))

      // Now the URL input inside AnalyzeUrlSection should be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('https://exemplo.com/produto')).toBeDefined()
      })
    })
  })
})
