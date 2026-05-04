import { PresellSummaryCard } from '@/features/presells/components/PresellSummaryCard.tsx'
import type {
  PresellStatus,
  PresellSummary,
  TemplateMetadata,
} from '@/features/presells/types.ts'

type PresellWorkspaceSidebarProps = {
  activePresellId: number | null
  isCreating: boolean
  items: PresellSummary[]
  searchTerm: string
  selectedStatus: 'all' | PresellStatus
  selectedTemplateId: string
  templates: TemplateMetadata[]
  onCreateNew: () => void
  onSearchTermChange: (value: string) => void
  onSelectPresell: (presellId: number) => void
  onStatusChange: (value: 'all' | PresellStatus) => void
  onTemplateChange: (value: string) => void
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Never updated'
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

export function PresellWorkspaceSidebar({
  activePresellId,
  isCreating,
  items,
  searchTerm,
  selectedStatus,
  selectedTemplateId,
  templates,
  onCreateNew,
  onSearchTermChange,
  onSelectPresell,
  onStatusChange,
  onTemplateChange,
}: PresellWorkspaceSidebarProps) {
  const filteredItems = items.filter((item) => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesTemplate = !selectedTemplateId || item.templateId === selectedTemplateId
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const matchesSearch =
      normalizedSearch.length === 0
      || [item.title, item.headline, item.slug]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)

    return matchesStatus && matchesTemplate && matchesSearch
  })

  const draftCount = items.filter((item) => item.status === 'draft').length
  const publishedCount = items.filter((item) => item.status === 'published').length

  return (
    <aside className="presell-sidebar">
      <div className="stats-grid">
        <PresellSummaryCard
          label="Total presells"
          value={String(items.length)}
          helper="Loaded from the admin collection endpoint."
        />
        <PresellSummaryCard
          label="Drafts"
          value={String(draftCount)}
          helper="Unsaved changes stay local until you submit."
        />
        <PresellSummaryCard
          label="Published"
          value={String(publishedCount)}
          helper="These already expose public and redirect URLs."
        />
      </div>

      <div className="section-card presell-sidebar__panel">
        <div className="section-card__header">
          <p className="eyebrow">Collection browser</p>
          <h3>Find or create a presell</h3>
          <p className="section-card__description">
            Browse the current collection, then open one record in the editor.
          </p>
        </div>

        <div className="section-card__content presell-sidebar__content">
          <div className="button-row">
            <button className="button-link" type="button" onClick={onCreateNew}>
              New presell
            </button>
          </div>

          <div className="field-grid field-grid--sidebar">
            <label className="form-field" htmlFor="presell-search">
              <span>Search</span>
              <input
                id="presell-search"
                type="search"
                placeholder="Title, headline, or slug"
                value={searchTerm}
                onChange={(event) => {
                  onSearchTermChange(event.currentTarget.value)
                }}
              />
            </label>

            <label className="form-field" htmlFor="presell-status-filter">
              <span>Status</span>
              <select
                id="presell-status-filter"
                value={selectedStatus}
                onChange={(event) => {
                  onStatusChange(event.currentTarget.value as 'all' | PresellStatus)
                }}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="form-field" htmlFor="presell-template-filter">
              <span>Template</span>
              <select
                id="presell-template-filter"
                value={selectedTemplateId}
                onChange={(event) => {
                  onTemplateChange(event.currentTarget.value)
                }}
              >
                <option value="">All templates</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="presell-list" aria-live="polite">
            {isCreating ? (
              <div className="presell-list__draft-pill">
                <span className="status-pill status-pill--draft">New draft</span>
                <span>Unsaved record</span>
              </div>
            ) : null}

            {filteredItems.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <strong>No presells match these filters.</strong>
                <p>Adjust the filters or create a new record from scratch.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isActive = activePresellId === item.id && !isCreating
                const title = item.title || item.headline || item.slug

                return (
                  <button
                    key={item.id}
                    className={`presell-list__item${isActive ? ' presell-list__item--active' : ''}`}
                    type="button"
                    onClick={() => {
                      onSelectPresell(item.id)
                    }}
                  >
                    <div className="presell-list__item-header">
                      <strong>{title}</strong>
                      <span className={`status-pill status-pill--${item.status}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="presell-list__item-subtitle">/{item.slug} · {item.templateId}</p>
                    <p className="presell-list__item-meta">
                      Updated {formatTimestamp(item.timestamps.updatedAt)}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
