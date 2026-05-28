import { render, screen, waitFor } from '@testing-library/react'
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
    id: 'advertorial',
    name: 'Advertorial',
    description: 'Classic advertorial layout',
    fields: [],
    ...overrides,
  }
}

function makePresellDetail(overrides: Partial<PresellDetail> = {}): PresellDetail {
  return {
    id: 1,
    slug: 'test-presell',
    status: 'draft',
    templateId: 'advertorial',
    title: 'Test Presell',
    headline: 'Test Headline',
    subtitle: '',
    ctaText: 'Buy now',
    affiliateUrl: 'https://example.com',
    published: false,
    body: 'Body text',
    bullets: [],
    settings: {},
    media: { heroImage: null, backgroundImage: null },
    tracking: { googlePixelId: null },
    timestamps: { createdAt: null, updatedAt: null },
    urls: {
      publicPage: '/p/test-presell',
      redirect: '/go/test-presell',
      adminPreview: '/admin/presells/1/preview',
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

describe('PresellEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows form loaded with presell data in edit mode at /presells/:id/edit', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7, slug: 'loaded-slug', title: 'Loaded Title' }))

    renderPage('/presells/7/edit')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDefined()
    })

    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe('loaded-slug')
  })

  it('calls createPresell and navigates to edit route after successful create', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockCreatePresell.mockResolvedValue(makePresellDetail({ id: 99 }))

    renderPage('/presells/new')

    await waitFor(() => expect(screen.getByLabelText(/slug/i)).toBeDefined())

    await userEvent.type(screen.getByLabelText(/slug/i), 'new-slug')
    await userEvent.type(screen.getByLabelText(/internal title/i), 'New Title')
    await userEvent.type(screen.getByLabelText(/headline/i), 'New Headline')
    await userEvent.type(screen.getByLabelText(/cta text/i), 'Click here')
    await userEvent.type(screen.getByLabelText(/affiliate url/i), 'https://example.com')

    await userEvent.click(screen.getByRole('button', { name: /create presell/i }))

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

    await waitFor(() => expect(screen.getByRole('button', { name: /save changes/i })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdatePresell).toHaveBeenCalledWith(7, expect.objectContaining({ slug: 'existing-slug' }))
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Presell updated')
    })
  })

  it('calls deletePresell and navigates to /presells after deletion', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
    mockGetPresell.mockResolvedValue(makePresellDetail({ id: 7 }))
    mockDeletePresell.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage('/presells/7/edit')

    await waitFor(() => expect(screen.getByRole('button', { name: /^delete$/i })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

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

    await waitFor(() => expect(screen.getByRole('button', { name: /duplicate/i })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /duplicate/i }))

    await waitFor(() => {
      expect(mockDuplicatePresell).toHaveBeenCalledWith(7)
      expect(mockNavigate).toHaveBeenCalledWith('/presells/42/edit')
    })
  })

  it('shows empty form in create mode at /presells/new', async () => {
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })

    renderPage('/presells/new')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create presell/i })).toBeDefined()
    })

    expect((screen.getByLabelText(/slug/i) as HTMLInputElement).value).toBe('')
  })
})
