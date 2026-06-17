import { getSection } from '@/features/presells-v2/sections/registry.ts'
import '@/features/presells-v2/sections/index.ts'
import type { Section } from '@/features/presells-v2/sections/types.ts'

type SectionsPreviewProps = {
  sections: Section[]
}

export function SectionsPreview({ sections }: SectionsPreviewProps) {
  const ordered = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div
      data-testid="sections-preview"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      {ordered.map((section, index) => {
        const Component = getSection(section.type)
        if (!Component) return null
        return (
          <Component
            key={`${section.type}-${section.order}`}
            props={section.props as Record<string, unknown>}
          />
        )
      })}
    </div>
  )
}
