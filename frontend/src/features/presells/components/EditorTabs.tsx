import { cn } from '@/lib/utils'

export type TabId = 'content' | 'visual' | 'conversion' | 'publish'

type EditorTabsProps = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  tabValidity: Record<TabId, boolean>
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'content', label: 'Conteúdo' },
  { id: 'visual', label: 'Visual' },
  { id: 'conversion', label: 'Conversão' },
  { id: 'publish', label: 'Publicar' },
]

export function EditorTabs({ activeTab, onTabChange, tabValidity }: EditorTabsProps) {
  return (
    <div className="flex items-end gap-1 px-4">
      {TABS.map(({ id, label }) => {
        const isActive = id === activeTab
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              '-mb-px border-b-2',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300',
            )}
          >
            {label}
            {tabValidity[id] && (
              <span className={cn('text-xs leading-none', isActive ? 'text-primary' : 'text-green-600')}>
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
