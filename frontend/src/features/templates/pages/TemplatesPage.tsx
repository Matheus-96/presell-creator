import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { adminApi, type TemplateMetadata } from '@/lib/api/admin-api.ts'

type TemplateState = {
  isLoading: boolean
  error: string | null
  items: TemplateMetadata[]
}

const initialState: TemplateState = {
  isLoading: true,
  error: null,
  items: [],
}

export function TemplatesPage() {
  useDocumentTitle('Templates')

  const [state, setState] = useState<TemplateState>(initialState)

  useEffect(() => {
    let isCancelled = false

    async function loadTemplates() {
      try {
        const response = await adminApi.listTemplates()
        if (!isCancelled) {
          setState({ isLoading: false, error: null, items: response.items })
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unable to load templates.',
            items: [],
          })
        }
      }
    }

    void loadTemplates()

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Template registry"
        title="Live template catalog"
        description="The admin shell now reads the backend registry so template metadata is available before the full authoring experience lands."
      />

      {state.error ? (
        <SectionCard
          eyebrow="Load state"
          title="Templates could not be loaded"
          description={state.error}
        >
          <p className="page-description">
            Once the template endpoint responds again, this route will surface renderer metadata and field definitions automatically.
          </p>
        </SectionCard>
      ) : null}

      <div className="page-grid page-grid--two-up">
        {state.items.map((template) => (
          <SectionCard
            key={template.id}
            eyebrow={template.id}
            title={template.name}
            description={template.description}
          >
            <ul className="list list--compact">
              <li>
                <strong>Renderer:</strong>{' '}
                {template.renderer
                  ? `${template.renderer.kind} via ${template.renderer.engine}`
                  : 'Not reported'}
              </li>
              <li>
                <strong>Fields:</strong> {template.fields.length}
              </li>
              {template.previewContract?.selectors ? (
                <li>
                  <strong>Preview selectors:</strong>{' '}
                  {Object.keys(template.previewContract.selectors).length}
                </li>
              ) : null}
            </ul>

            {template.fields.length > 0 ? (
              <div className="tag-list">
                {template.fields.slice(0, 6).map((field) => (
                  <span key={field.name} className="tag tag--muted">
                    {field.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {state.isLoading ? 'Loading field definitions…' : 'No editable fields reported.'}
              </p>
            )}
          </SectionCard>
        ))}
      </div>

      {!state.isLoading && state.items.length === 0 && !state.error ? (
        <SectionCard
          eyebrow="Registry"
          title="No templates reported"
          description="The shell is wired correctly, but the backend template registry returned an empty catalog."
        >
          <p className="page-description">
            This route stays intentionally light until split-t12 introduces editor depth.
          </p>
        </SectionCard>
      ) : null}
    </div>
  )
}
