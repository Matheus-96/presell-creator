import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
} from 'react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { appConfig, joinConfigUrl } from '@/config/app-config.ts'
import { useAuth } from '@/features/auth/use-auth.ts'
import { PresellLivePreview } from '@/features/presells/components/PresellLivePreview.tsx'
import { PresellWorkspaceSidebar } from '@/features/presells/components/PresellWorkspaceSidebar.tsx'
import { TemplateSettingsFields } from '@/features/presells/components/TemplateSettingsFields.tsx'
import {
  applyTemplateSettings,
  buildPresellPayload,
  createEmptyPresellForm,
  createPresellForm,
  createPresellSnapshot,
  getTemplateById,
} from '@/features/presells/lib/presell-editor.ts'
import {
  createPresell,
  deletePresell,
  duplicatePresell,
  fetchWorkspaceBootstrap,
  getApiErrorMessage,
  getPresell,
  listPresells,
  listTemplates,
  updatePresell,
} from '@/features/presells/lib/presells-api.ts'
import type {
  AdminApiContract,
  AdminSession,
  PresellFormState,
  PresellSummary,
  PresellStatus,
  TemplateMetadata,
  WorkspaceNotice,
} from '@/features/presells/types.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

type WorkspaceState = {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  contract: AdminApiContract | null
  session: AdminSession | null
  templates: TemplateMetadata[]
  presells: PresellSummary[]
}

function createInitialWorkspaceState(): WorkspaceState {
  return {
    status: 'loading',
    error: null,
    contract: null,
    session: null,
    templates: [],
    presells: [],
  }
}

function resolveListLimit(contract: AdminApiContract | null) {
  return contract?.pagination?.maxLimit ?? 100
}

function buildLegacyLoginUrl(session: AdminSession | null) {
  return session?.links.login || joinConfigUrl(appConfig.legacyAdminUrl, '/login')
}

function resolveRuntimeOrigin() {
  const absoluteUrl = [appConfig.apiBaseUrl, appConfig.adminBaseUrl, appConfig.legacyAdminUrl].find(
    (value) => /^https?:\/\//.test(value),
  )

  if (absoluteUrl) {
    return new URL(absoluteUrl).origin
  }

  return window.location.origin
}

function resolveAbsoluteRuntimeUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  return new URL(path, resolveRuntimeOrigin()).toString()
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('Clipboard API unavailable')
  }
}

function formatSavedTimestamp(value: string | null) {
  if (!value) {
    return 'Not saved yet'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getEditorTitle(form: PresellFormState | null) {
  if (!form) {
    return 'Loading editor'
  }

  if (!form.id) {
    return 'Create a new presell'
  }

  return form.title || form.headline || form.slug || `Presell #${form.id}`
}

export function PresellsPage() {
  useDocumentTitle('Presells')

  const auth = useAuth()
  const [workspace, setWorkspace] = useState<WorkspaceState>(createInitialWorkspaceState)
  const [activePresellId, setActivePresellId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [draft, setDraft] = useState<PresellFormState | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const [notice, setNotice] = useState<WorkspaceNotice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PresellStatus>('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [previewHighlightSelector, setPreviewHighlightSelector] = useState<string | null>(null)
  const selectedPresellId = isCreating ? null : activePresellId ?? workspace.presells[0]?.id ?? null

  const selectedTemplate = useMemo(
    () => (draft ? getTemplateById(workspace.templates, draft.templateId) : null),
    [draft, workspace.templates],
  )

  const isDirty = useMemo(() => {
    if (!draft) {
      return false
    }

    return createPresellSnapshot(draft) !== initialSnapshot
  }, [draft, initialSnapshot])

  const refreshPresellCollection = useCallback(
    async (contract: AdminApiContract, session: AdminSession) => {
      const response = await listPresells(resolveListLimit(contract))
      setWorkspace((current) => ({
        ...current,
        contract,
        presells: response.items,
        session,
      }))
      return response.items
    },
    [],
  )

  const reloadWorkspace = useCallback(async () => {
    setWorkspace((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }))

    try {
      const { contract, session } = await fetchWorkspaceBootstrap()

      if (!session.authenticated) {
        setWorkspace({
          status: 'ready',
          error: null,
          contract,
          session,
          templates: [],
          presells: [],
        })
        return
      }

      const [templateCatalog, presellList] = await Promise.all([
        listTemplates(),
        listPresells(resolveListLimit(contract)),
      ])

      setWorkspace({
        status: 'ready',
        error: null,
        contract,
        session,
        templates: templateCatalog.items,
        presells: presellList.items,
      })
    } catch (error) {
      setWorkspace({
        status: 'error',
        error: getApiErrorMessage(error, 'Unable to load the presell workspace.'),
        contract: null,
        session: null,
        templates: [],
        presells: [],
      })
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function bootstrapWorkspace() {
      try {
        const { contract, session } = await fetchWorkspaceBootstrap()

        if (ignore) {
          return
        }

        if (!session.authenticated) {
          setWorkspace({
            status: 'ready',
            error: null,
            contract,
            session,
            templates: [],
            presells: [],
          })
          return
        }

        const [templateCatalog, presellList] = await Promise.all([
          listTemplates(),
          listPresells(resolveListLimit(contract)),
        ])

        if (ignore) {
          return
        }

        setWorkspace({
          status: 'ready',
          error: null,
          contract,
          session,
          templates: templateCatalog.items,
          presells: presellList.items,
        })
      } catch (error) {
        if (ignore) {
          return
        }

        setWorkspace({
          status: 'error',
          error: getApiErrorMessage(error, 'Unable to load the presell workspace.'),
          contract: null,
          session: null,
          templates: [],
          presells: [],
        })
      }
    }

    void bootstrapWorkspace()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (workspace.status !== 'ready' || !workspace.session?.authenticated) {
      return
    }

    if (!selectedPresellId) {
      return
    }

    let ignore = false
    const currentPresellId = selectedPresellId

    async function loadSelectedPresell() {
      setDetailStatus('loading')

      try {
        const detail = await getPresell(currentPresellId)

        if (ignore) {
          return
        }

        const nextForm = createPresellForm(
          detail,
          getTemplateById(workspace.templates, detail.templateId),
        )

        setDraft(nextForm)
        setInitialSnapshot(createPresellSnapshot(nextForm))
        setDetailStatus('idle')
      } catch (error) {
        if (ignore) {
          return
        }

        setDraft(null)
        setDetailStatus('error')
        setNotice({
          tone: 'warning',
          title: 'Could not load the selected presell',
          description: getApiErrorMessage(error, 'Try opening the record again.'),
        })
      }
    }

    void loadSelectedPresell()

    return () => {
      ignore = true
    }
  }, [selectedPresellId, workspace.session?.authenticated, workspace.status, workspace.templates])

  const updateDraft = useCallback(
    (updater: (current: PresellFormState) => PresellFormState) => {
      setDraft((current) => (current ? updater(current) : current))
    },
    [],
  )

  const confirmDiscard = useCallback(() => {
    if (!isDirty) {
      return true
    }

    return window.confirm('Discard the current unsaved changes?')
  }, [isDirty])

  const openCreateFlow = useCallback(() => {
    if (!confirmDiscard()) {
      return
    }

    const nextForm = createEmptyPresellForm(getTemplateById(workspace.templates, 'advertorial'))

    setNotice(null)
    setIsCreating(true)
    setActivePresellId(null)
    setDraft(nextForm)
    setInitialSnapshot(createPresellSnapshot(nextForm))
    setDetailStatus('idle')
  }, [confirmDiscard, workspace.templates])

  const openPresell = useCallback(
    (presellId: number) => {
      if (!confirmDiscard()) {
        return
      }

      setNotice(null)
      setIsCreating(false)
      setActivePresellId(presellId)
    },
    [confirmDiscard],
  )

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!draft || !workspace.contract || !workspace.session?.authenticated) {
        return
      }

      setIsSaving(true)
      setNotice(null)

      try {
        const payload = buildPresellPayload(draft, selectedTemplate)
        const savedPresell = draft.id
          ? await updatePresell(
            draft.id,
            payload,
            workspace.contract,
            workspace.session.csrfToken,
          )
          : await createPresell(payload, workspace.contract, workspace.session.csrfToken)

        const nextForm = createPresellForm(
          savedPresell,
          getTemplateById(workspace.templates, savedPresell.templateId),
        )

        setDraft(nextForm)
        setInitialSnapshot(createPresellSnapshot(nextForm))
        setIsCreating(false)
        setActivePresellId(savedPresell.id)
        setNotice({
          title: draft.id ? 'Presell updated' : 'Presell created',
          description:
            draft.id
              ? 'The latest editor values were saved to the CRUD API.'
              : 'The new presell is now available in the collection.',
        })

        await refreshPresellCollection(workspace.contract, workspace.session)
      } catch (error) {
        setNotice({
          tone: 'warning',
          title: 'Save failed',
          description: getApiErrorMessage(error, 'Unable to persist the presell right now.'),
        })
      } finally {
        setIsSaving(false)
      }
    },
    [draft, refreshPresellCollection, selectedTemplate, workspace.contract, workspace.session, workspace.templates],
  )

  const handleDuplicate = useCallback(async () => {
    if (!draft?.id || !workspace.contract || !workspace.session?.authenticated) {
      return
    }

    setIsDuplicating(true)
    setNotice(null)

    try {
      const duplicatedPresell = await duplicatePresell(
        draft.id,
        workspace.contract,
        workspace.session.csrfToken,
      )

      setIsCreating(false)
      setActivePresellId(duplicatedPresell.id)
      setNotice({
        title: 'Presell duplicated',
        description: 'A copy was created and opened in the editor.',
      })

      await refreshPresellCollection(workspace.contract, workspace.session)
    } catch (error) {
      setNotice({
        tone: 'warning',
        title: 'Duplicate failed',
        description: getApiErrorMessage(error, 'Unable to duplicate this presell.'),
      })
    } finally {
      setIsDuplicating(false)
    }
  }, [draft, refreshPresellCollection, workspace.contract, workspace.session])

  const handleDelete = useCallback(async () => {
    if (!draft?.id || !workspace.contract || !workspace.session?.authenticated) {
      return
    }

    if (!window.confirm('Delete this presell permanently?')) {
      return
    }

    setIsDeleting(true)
    setNotice(null)

    try {
      await deletePresell(draft.id, workspace.contract, workspace.session.csrfToken)
      const updatedCollection = await refreshPresellCollection(workspace.contract, workspace.session)

      setNotice({
        title: 'Presell deleted',
        description: 'The record was removed from the collection.',
      })

      if (updatedCollection[0]) {
        setIsCreating(false)
        setActivePresellId(updatedCollection[0].id)
      } else {
        const nextForm = createEmptyPresellForm(getTemplateById(workspace.templates, 'advertorial'))
        setIsCreating(true)
        setActivePresellId(null)
        setDraft(nextForm)
        setInitialSnapshot(createPresellSnapshot(nextForm))
        setDetailStatus('idle')
      }
    } catch (error) {
      setNotice({
        tone: 'warning',
        title: 'Delete failed',
        description: getApiErrorMessage(error, 'Unable to delete the selected presell.'),
      })
    } finally {
      setIsDeleting(false)
    }
  }, [draft, refreshPresellCollection, workspace.contract, workspace.session, workspace.templates])

  async function handleCopyPublicLink() {
    const publicPageUrl = draft?.urls?.publicPage

    if (!publicPageUrl) {
      return
    }

    const publicUrl = resolveAbsoluteRuntimeUrl(publicPageUrl)

    try {
      await copyText(publicUrl)
      setNotice({
        title: 'Public link copied',
        description: publicUrl,
      })
    } catch {
      setNotice({
        tone: 'warning',
        title: 'Copy failed',
        description: 'Unable to copy the public link from this browser context.',
      })
    }
  }

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const nextTemplate = getTemplateById(workspace.templates, templateId)

      updateDraft((current) => ({
        ...current,
        templateId: nextTemplate?.id ?? current.templateId,
        settings: applyTemplateSettings(nextTemplate, current.settings),
      }))
    },
    [updateDraft, workspace.templates],
  )

  const syncPreviewHighlightFromActiveElement = useCallback(() => {
    const activeElement = document.activeElement

    if (!(activeElement instanceof HTMLElement)) {
      setPreviewHighlightSelector(null)
      return
    }

    setPreviewHighlightSelector(activeElement.dataset.previewSelector?.trim() || null)
  }, [])

  const handleEditorFocusCapture = useCallback((event: ReactFocusEvent<HTMLFormElement>) => {
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    setPreviewHighlightSelector(target.dataset.previewSelector?.trim() || null)
  }, [])

  const handleEditorBlurCapture = useCallback(() => {
    window.requestAnimationFrame(syncPreviewHighlightFromActiveElement)
  }, [syncPreviewHighlightFromActiveElement])

  if (workspace.status === 'loading' && !workspace.session) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Presell editor"
          title="Loading workspace"
          description="Bootstrapping session state, contracts, and the current presell collection."
        />
      </div>
    )
  }

  if (workspace.status === 'error') {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Presell editor"
          title="Workspace unavailable"
          description="The React editor could not finish loading its backend dependencies."
        />

        <StatusBanner
          tone="warning"
          title="Presell workspace failed to load"
          description={workspace.error ?? 'An unexpected error blocked the editor.'}
          action={
            <button className="button-link" type="button" onClick={() => void reloadWorkspace()}>
              Retry workspace load
            </button>
          }
        />
      </div>
    )
  }

  if (!workspace.session?.authenticated) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Presell editor"
          title="Admin session required"
          description="The editor now depends on the authenticated CRUD and template endpoints from the split backend."
        />

        <StatusBanner
          tone="warning"
          title="Sign in to edit presells"
          description="Open the existing admin login, then return here. The React workspace will reuse the same cookie-backed session."
          meta={[
            `Auth mode: ${auth.mode}`,
            `Capabilities loaded: ${workspace.session?.capabilities.length ?? 0}`,
          ]}
          action={
            <>
              <a className="button-link" href={buildLegacyLoginUrl(workspace.session)}>
                Open legacy login
              </a>
              <button
                className="button-link button-link--secondary"
                type="button"
                onClick={() => void reloadWorkspace()}
              >
                Refresh session
              </button>
            </>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presell editor"
        title={getEditorTitle(draft)}
        description="Create, edit, duplicate, preview, and remove presells against the split admin APIs without falling back to the legacy hidden-form flow."
        aside={
          <div className="page-badges" aria-label="Editor status">
            <span className="tag">{workspace.presells.length} loaded</span>
            <span className="tag">{isDirty ? 'Unsaved changes' : 'Synced'}</span>
            <span className="tag">{selectedTemplate?.name ?? 'Template pending'}</span>
          </div>
        }
      />

      {notice ? (
        <StatusBanner
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      ) : null}

      <div className="presell-workspace">
        <PresellWorkspaceSidebar
          activePresellId={selectedPresellId}
          isCreating={isCreating}
          items={workspace.presells}
          searchTerm={searchTerm}
          selectedStatus={selectedStatus}
          selectedTemplateId={selectedTemplateId}
          templates={workspace.templates}
          onCreateNew={openCreateFlow}
          onSearchTermChange={setSearchTerm}
          onSelectPresell={openPresell}
          onStatusChange={setSelectedStatus}
          onTemplateChange={setSelectedTemplateId}
        />

        <div className="presell-editor-column">
          <StatusBanner
            title={isCreating ? 'Unsaved draft' : 'Editor ready'}
            description={
              isCreating
                ? 'This form will POST a new record when you save.'
                : 'This form PATCHes the selected presell and keeps the live preview synced with the backend runtime.'
            }
            meta={[
              `User: ${workspace.session.user?.username ?? 'admin'}`,
              `CSRF header: ${workspace.contract?.auth.csrf.header ?? 'x-csrf-token'}`,
              `Session strategy: ${workspace.session.authStrategy}`,
            ]}
          />

          {detailStatus === 'loading' ? (
            <SectionCard
              eyebrow="Editor state"
              title="Loading presell details"
              description="Pulling the full record before rendering the editable form."
            >
              <p className="page-description">The list is ready, and the detail payload is on the way.</p>
            </SectionCard>
          ) : null}

          <PresellLivePreview
            contract={workspace.contract}
            csrfToken={workspace.session.csrfToken}
            detailStatus={detailStatus}
            draft={draft}
            highlightSelector={previewHighlightSelector}
            template={selectedTemplate}
          />

          {draft ? (
            <form
              className="presell-editor-form"
              onSubmit={handleSave}
              onFocusCapture={handleEditorFocusCapture}
              onBlurCapture={handleEditorBlurCapture}
            >
              <SectionCard
                eyebrow="Actions"
                title="Save and lifecycle controls"
                description="CRUD mutations hit the new admin contract without changing backend behavior."
              >
                <div className="button-row">
                  <button className="button-link" disabled={isSaving} type="submit">
                    {isSaving ? 'Saving…' : draft.id ? 'Save changes' : 'Create presell'}
                  </button>
                  <button
                    className="button-link button-link--secondary"
                    disabled={isSaving || isDuplicating || !draft.id}
                    type="button"
                    onClick={() => {
                      void handleDuplicate()
                    }}
                  >
                    {isDuplicating ? 'Duplicating…' : 'Duplicate'}
                  </button>
                  <button
                    className="button-link button-link--danger"
                    disabled={isSaving || isDeleting || !draft.id}
                    type="button"
                    onClick={() => {
                      void handleDelete()
                    }}
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Basic info"
                title="Identity and template selection"
                description="Slug, status, and template settings match the current presell write contract."
              >
                <div className="field-grid">
                  <label className="form-field" htmlFor="presell-slug">
                    <span>Slug</span>
                    <input
                      id="presell-slug"
                      required
                      placeholder="my-presell"
                      value={draft.slug}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          slug: value,
                        }))
                      }}
                    />
                  </label>

                  <label className="form-field" htmlFor="presell-status">
                    <span>Status</span>
                    <select
                      id="presell-status"
                      value={draft.status}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          status: value as PresellStatus,
                        }))
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>

                  <label className="form-field" htmlFor="presell-template">
                    <span>Template</span>
                    <select
                      id="presell-template"
                      value={draft.templateId}
                      onChange={(event) => {
                        handleTemplateChange(event.currentTarget.value)
                      }}
                    >
                      {workspace.templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="helper-text">{selectedTemplate?.description}</p>
                  </label>

                  <label className="form-field" htmlFor="presell-title">
                    <span>Internal title</span>
                    <input
                      id="presell-title"
                      required
                      value={draft.title}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          title: value,
                        }))
                      }}
                    />
                  </label>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Content"
                title="Headline and body copy"
                description="These fields stay close to the server-rendered authoring flow, just now inside the React workspace."
              >
                <div className="field-grid">
                  <label className="form-field form-field--full" htmlFor="presell-headline">
                    <span>Headline</span>
                    <input
                      id="presell-headline"
                      data-preview-selector={selectedTemplate?.previewContract?.selectors.headline ?? undefined}
                      required
                      value={draft.headline}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          headline: value,
                        }))
                      }}
                    />
                  </label>

                  <label className="form-field form-field--full" htmlFor="presell-subtitle">
                    <span>Subtitle</span>
                    <input
                      id="presell-subtitle"
                      data-preview-selector={selectedTemplate?.previewContract?.selectors.subtitle ?? undefined}
                      value={draft.subtitle}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          subtitle: value,
                        }))
                      }}
                    />
                  </label>

                  <label className="form-field form-field--full" htmlFor="presell-body">
                    <span>Body</span>
                    <textarea
                      id="presell-body"
                      data-preview-selector={selectedTemplate?.previewContract?.selectors.body ?? undefined}
                      rows={8}
                      value={draft.body}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          body: value,
                        }))
                      }}
                    />
                  </label>

                  <label className="form-field form-field--full" htmlFor="presell-bullets">
                    <span>Bullets / benefits</span>
                    <textarea
                      id="presell-bullets"
                      data-preview-selector={selectedTemplate?.previewContract?.selectors.bullets ?? undefined}
                      rows={6}
                      placeholder="One benefit per line"
                      value={draft.bulletsText}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          bulletsText: value,
                        }))
                      }}
                    />
                    <p className="helper-text">One benefit per line. The API still stores the normalized list.</p>
                  </label>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Conversion"
                title="CTA, affiliate link, and tracking"
                description="Everything here maps directly to the presell CRUD payload used by the split backend."
              >
                <div className="field-grid">
                  <label className="form-field" htmlFor="presell-cta-text">
                    <span>CTA text</span>
                    <input
                      id="presell-cta-text"
                      data-preview-selector={selectedTemplate?.previewContract?.selectors.cta_text ?? undefined}
                      required
                      value={draft.ctaText}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          ctaText: value,
                        }))
                      }}
                    />
                  </label>

                  <label className="form-field" htmlFor="presell-affiliate-url">
                    <span>Affiliate URL</span>
                    <input
                      id="presell-affiliate-url"
                      required
                      type="url"
                      placeholder="https://example.com/offer"
                      value={draft.affiliateUrl}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          affiliateUrl: value,
                        }))
                      }}
                    />
                  </label>

                  <label className="form-field" htmlFor="presell-google-pixel">
                    <span>Google pixel ID</span>
                    <input
                      id="presell-google-pixel"
                      placeholder="Optional"
                      value={draft.googlePixelId}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          googlePixelId: value,
                        }))
                      }}
                    />
                    <p className="helper-text">Stored as tracking.googlePixelId in the admin API response.</p>
                  </label>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Media"
                title="Hero and background references"
                description="The editor keeps media references in the CRUD payload and leaves richer upload/preview interactions for follow-up slices."
              >
                <div className="field-grid">
                  <label className="form-field" htmlFor="presell-hero-image">
                    <span>Hero image file name</span>
                    <input
                      id="presell-hero-image"
                      placeholder="existing-upload.webp"
                      value={draft.media.heroImageFileName}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          media: {
                            ...current.media,
                            heroImageFileName: value,
                          },
                        }))
                      }}
                    />
                    <p className="helper-text">
                      Leave blank to remove on save. Current preview URL:{' '}
                      {draft.media.heroImageFileName
                        ? `/media/${encodeURIComponent(draft.media.heroImageFileName)}`
                        : 'none'}
                    </p>
                  </label>

                  <label className="form-field" htmlFor="presell-background-image">
                    <span>Background image file name</span>
                    <input
                      id="presell-background-image"
                      placeholder="background-image.webp"
                      value={draft.media.backgroundImageFileName}
                      onChange={(event) => {
                        const { value } = event.currentTarget
                        updateDraft((current) => ({
                          ...current,
                          media: {
                            ...current.media,
                            backgroundImageFileName: value,
                          },
                        }))
                      }}
                    />
                    <p className="helper-text">
                      Especially useful for background-driven templates. Leave blank to remove on save.
                    </p>
                  </label>

                  <div className="form-field form-field--full">
                    <span>Current media state</span>
                    <div className="media-reference-grid">
                      <div className="media-reference-card">
                        <strong>Hero image</strong>
                        <p>{draft.media.heroImageReference?.fileName ?? 'No saved hero image'}</p>
                      </div>
                      <div className="media-reference-card">
                        <strong>Background image</strong>
                        <p>{draft.media.backgroundImageReference?.fileName ?? 'No saved background image'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Template settings"
                title="Dynamic fields from template metadata"
                description="These controls are rendered from the template catalog and keep their values aligned with template contracts."
              >
                <TemplateSettingsFields
                  settings={draft.settings}
                  template={selectedTemplate}
                  onChange={(fieldName, value) => {
                    updateDraft((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        [fieldName]: value,
                      },
                    }))
                  }}
                />
              </SectionCard>

              <SectionCard
                eyebrow="Preview readiness"
                title="Saved URLs and runtime metadata"
                description="The live iframe and the saved URLs below now share the same runtime contracts and preview metadata."
              >
                <ul className="list list--spacious">
                  <li>Renderer entry: {selectedTemplate?.renderer?.entry ?? 'Not provided'}</li>
                  <li>Preview selectors: {selectedTemplate?.previewContract?.fields.length ?? 0}</li>
                  <li>
                    <div className="button-row">
                      <span>Public URL: {draft.urls?.publicPage ?? 'Available after the first save'}</span>
                      <button
                        className="button-link button-link--secondary"
                        type="button"
                        onClick={() => {
                          void handleCopyPublicLink()
                        }}
                        disabled={!draft.urls?.publicPage}
                      >
                        Copy link
                      </button>
                    </div>
                  </li>
                  <li>Redirect URL: {draft.urls?.redirect ?? 'Available after the first save'}</li>
                  <li>Admin preview URL: {draft.urls?.adminPreview ?? 'Available after the first save'}</li>
                  <li>Last updated: {formatSavedTimestamp(draft.timestamps.updatedAt)}</li>
                </ul>
              </SectionCard>
            </form>
          ) : (
            <SectionCard
              eyebrow="Editor state"
              title="Select a presell to begin"
              description="The collection list is ready, but there is no active record in the editor yet."
            >
              <div className="button-row">
                <button className="button-link" type="button" onClick={openCreateFlow}>
                  Create a new presell
                </button>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
