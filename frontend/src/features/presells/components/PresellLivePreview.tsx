import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { appConfig } from '@/config/app-config.ts'
import {
  buildPreviewPayload,
  createPresellSnapshot,
} from '@/features/presells/lib/presell-editor.ts'
import { getApiErrorMessage, renderPreview } from '@/features/presells/lib/presells-api.ts'
import type {
  AdminApiContract,
  PresellFormState,
  PreviewDocument,
  TemplateMetadata,
} from '@/features/presells/types.ts'

const PREVIEW_DEBOUNCE_MS = 500

type PreviewState = {
  status: 'idle' | 'loading' | 'refreshing' | 'ready' | 'error'
  document: PreviewDocument | null
  html: string
  error: string | null
  lastRenderedAt: string | null
}

type PresellLivePreviewProps = {
  draft: PresellFormState | null
  template: TemplateMetadata | null
  contract: AdminApiContract | null
  csrfToken: string | null
  detailStatus: 'idle' | 'loading' | 'error'
  highlightSelector: string | null
}

function createInitialPreviewState(): PreviewState {
  return {
    status: 'idle',
    document: null,
    html: '',
    error: null,
    lastRenderedAt: null,
  }
}

function resolveBackendOrigin() {
  const absoluteUrl = [appConfig.apiBaseUrl, appConfig.adminBaseUrl, appConfig.legacyAdminUrl].find((value) =>
    /^https?:\/\//.test(value),
  )

  if (absoluteUrl) {
    return new URL(absoluteUrl).origin
  }

  return window.location.origin
}

function absolutizePreviewHtml(html: string, backendOrigin: string) {
  const trimmedHtml = html.trim()

  if (!trimmedHtml) {
    return html
  }

  const parser = new DOMParser()
  const previewDocument = parser.parseFromString(trimmedHtml, 'text/html')
  const root = previewDocument.documentElement

  if (!root) {
    return html
  }

  const head = previewDocument.head ?? previewDocument.createElement('head')
  const existingBase = head.querySelector('base[data-react-preview="true"]')
  const baseElement = existingBase ?? previewDocument.createElement('base')

  baseElement.setAttribute('data-react-preview', 'true')
  baseElement.setAttribute('href', `${backendOrigin}/`)

  if (!existingBase) {
    head.prepend(baseElement)
  }

  const urlAttributes = ['src', 'href', 'action', 'poster'] as const

  urlAttributes.forEach((attribute) => {
    previewDocument.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
      const value = element.getAttribute(attribute)

      if (value?.startsWith('/')) {
        element.setAttribute(attribute, `${backendOrigin}${value}`)
      }
    })
  })

  previewDocument.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const inlineStyle = element.getAttribute('style')

    if (!inlineStyle?.includes('url(/')) {
      return
    }

    element.setAttribute(
      'style',
      inlineStyle.replace(/url\((['"]?)\/(?!\/)/g, `url($1${backendOrigin}/`),
    )
  })

  return `<!doctype html>\n${root.outerHTML}`
}

function formatRenderedAt(value: string | null) {
  if (!value) {
    return 'Pending'
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

function resolvePreviewFieldInputId(
  template: TemplateMetadata | null,
  inputName: string,
) {
  const coreFieldMap: Record<string, string> = {
    headline: 'presell-headline',
    subtitle: 'presell-subtitle',
    body: 'presell-body',
    bullets: 'presell-bullets',
    cta_text: 'presell-cta-text',
  }

  if (coreFieldMap[inputName]) {
    return coreFieldMap[inputName]
  }

  const previewField = template?.previewContract?.fields.find(
    (field) => field.inputName === inputName || field.key === inputName,
  )

  return previewField ? `template-setting-${previewField.key}` : null
}

export function PresellLivePreview({
  draft,
  template,
  contract,
  csrfToken,
  detailStatus,
  highlightSelector,
}: PresellLivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const requestIdRef = useRef(0)
  const backendOrigin = useMemo(resolveBackendOrigin, [])
  const [previewState, setPreviewState] = useState<PreviewState>(createInitialPreviewState)
  const draftSnapshot = useMemo(() => (draft ? createPresellSnapshot(draft) : ''), [draft])

  const previewBlockedReason = useMemo(() => {
    if (!draft) {
      return 'Select or create a presell to render the live preview.'
    }

    if (detailStatus === 'loading') {
      return 'Loading the selected presell before refreshing the iframe.'
    }

    if (!template) {
      return 'Choose a template to unlock the preview runtime.'
    }

    if (!template.renderer) {
      return 'This template is missing renderer metadata in the admin catalog.'
    }

    if (!template.previewContract) {
      return 'This template is missing preview contract metadata.'
    }

    if (!contract) {
      return 'The admin API contract is not available yet.'
    }

    if (!csrfToken) {
      return 'A CSRF token is required before the preview endpoint can render.'
    }

    if (detailStatus === 'error') {
      return 'The selected presell could not be loaded, so the preview stayed frozen.'
    }

    return null
  }, [contract, csrfToken, detailStatus, draft, template])

  const syncPreviewHighlight = useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow

    if (!iframeWindow) {
      return
    }

    iframeWindow.postMessage(
      highlightSelector
        ? { type: 'highlight', selector: highlightSelector }
        : { type: 'unhighlight' },
      '*',
    )
  }, [highlightSelector])

  const requestPreview = useCallback(async () => {
    if (!draft || !template || !template.renderer || !template.previewContract || !contract || !csrfToken) {
      return
    }

    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId

    setPreviewState((current) => ({
      ...current,
      status: current.html ? 'refreshing' : 'loading',
      error: null,
    }))

    try {
      const previewDocument = await renderPreview(buildPreviewPayload(draft, template), contract, csrfToken)

      if (requestIdRef.current !== currentRequestId) {
        return
      }

      setPreviewState({
        status: 'ready',
        document: previewDocument,
        html: absolutizePreviewHtml(previewDocument.html, backendOrigin),
        error: null,
        lastRenderedAt: new Date().toISOString(),
      })
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return
      }

      setPreviewState((current) => ({
        ...current,
        status: 'error',
        error: getApiErrorMessage(error, 'Unable to render the latest preview.'),
      }))
    }
  }, [backendOrigin, contract, csrfToken, draft, template])

  useEffect(() => {
    if (!draft) {
      setPreviewState(createInitialPreviewState())
    }
  }, [draft])

  useEffect(() => {
    if (previewBlockedReason) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void requestPreview()
    }, PREVIEW_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [draftSnapshot, previewBlockedReason, requestPreview])

  useEffect(() => {
    syncPreviewHighlight()
  }, [previewState.html, syncPreviewHighlight])

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }

      const payload = event.data

      if (
        !payload
        || typeof payload !== 'object'
        || payload.type !== 'preview-click'
        || typeof payload.fieldName !== 'string'
      ) {
        return
      }

      const inputId = resolvePreviewFieldInputId(template, payload.fieldName)

      if (!inputId) {
        return
      }

      const element = document.getElementById(inputId)

      if (!(element instanceof HTMLElement)) {
        return
      }

      element.focus()
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }

    window.addEventListener('message', handlePreviewMessage)

    return () => {
      window.removeEventListener('message', handlePreviewMessage)
    }
  }, [template])

  const previewMeta = [
    `Mode: ${previewState.document?.runtime.mode ?? 'preview'}`,
    `Template: ${template?.name ?? 'Pending'}`,
    `Renderer: ${template?.renderer?.entry ?? 'Unavailable'}`,
    `Selectors: ${template?.previewContract?.fields.length ?? 0}`,
    `Last render: ${formatRenderedAt(previewState.lastRenderedAt)}`,
  ]

  const openSavedPreviewUrl = draft?.urls?.adminPreview
    ? new URL(draft.urls.adminPreview, `${backendOrigin}/`).toString()
    : null

  return (
    <SectionCard
      eyebrow="Live preview"
      title="Runtime-backed preview iframe"
      description="This iframe renders the current draft through POST /admin/previews and keeps the template runtime contracts in the loop."
    >
      <div className="preview-panel">
        <div className="preview-panel__toolbar">
          <ul className="preview-panel__meta" aria-label="Preview runtime details">
            {previewMeta.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="button-row">
            <button
              className="button-link button-link--secondary"
              disabled={
                Boolean(previewBlockedReason)
                || previewState.status === 'loading'
                || previewState.status === 'refreshing'
              }
              type="button"
              onClick={() => {
                void requestPreview()
              }}
            >
              {previewState.status === 'refreshing' ? 'Refreshing…' : 'Refresh preview'}
            </button>

            {openSavedPreviewUrl ? (
              <a
                className="button-link button-link--secondary"
                href={openSavedPreviewUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open saved preview
              </a>
            ) : null}
          </div>
        </div>

        {previewBlockedReason && !previewState.html ? (
          <div className="empty-state">
            <strong>Preview not ready yet.</strong>
            <p>{previewBlockedReason}</p>
          </div>
        ) : (
          <div className="preview-panel__viewport">
            {previewState.html ? (
              <iframe
                ref={iframeRef}
                className="preview-panel__frame"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                srcDoc={previewState.html}
                title="Presell live preview"
                onLoad={syncPreviewHighlight}
              />
            ) : (
              <div className="empty-state empty-state--compact">
                <strong>Rendering the first preview…</strong>
                <p>The iframe will appear here once the draft is sent to the preview API.</p>
              </div>
            )}

            {previewState.status === 'loading' || previewState.status === 'refreshing' ? (
              <div className="preview-panel__overlay" aria-live="polite">
                <strong>{previewState.status === 'loading' ? 'Rendering preview…' : 'Refreshing preview…'}</strong>
                <p>Changes are being rendered through the template runtime.</p>
              </div>
            ) : null}
          </div>
        )}

        {previewState.error ? (
          <p className="helper-text preview-panel__feedback">
            Preview error: {previewState.error}
          </p>
        ) : null}

        {!previewState.error && previewState.html ? (
          <p className="helper-text preview-panel__feedback">
            Focus a preview-aware field to highlight its selector inside the iframe, or click the iframe to jump back to the editor.
          </p>
        ) : null}
      </div>
    </SectionCard>
  )
}
