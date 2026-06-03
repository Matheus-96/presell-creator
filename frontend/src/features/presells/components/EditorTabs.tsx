export type TabId = 'content' | 'visual' | 'conversion' | 'publish'

type Tab = {
  id: TabId
  label: string
  isValid: boolean
}

type EditorTabsProps = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  tabValidity: Record<TabId, boolean>
}

const TABS: Pick<Tab, 'id' | 'label'>[] = [
  { id: 'content', label: 'Conteúdo' },
  { id: 'visual', label: 'Visual' },
  { id: 'conversion', label: 'Conversão' },
  { id: 'publish', label: 'Publicar' },
]

export function EditorTabs({ activeTab, onTabChange, tabValidity }: EditorTabsProps) {
  return (
    <nav
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        gap: 'var(--p-space-4)',
      }}
    >
      {TABS.map(({ id, label }) => {
        const isActive = id === activeTab
        const isValid = tabValidity[id]

        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              padding: 'var(--p-space-2) 0',
              marginBottom: '-1px',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--p-text)' : 'var(--p-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--p-space-2)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
            {!isActive && isValid && (
              <span style={{ color: '#16a34a', fontSize: '0.875rem', lineHeight: 1 }}>✓</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
