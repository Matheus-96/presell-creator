import { Button } from '@/components/ui/button.tsx'
import { SECTION_LABELS, createDefaultSection } from '@/features/presells-v2/sections/defaults.ts'
import type { Section, SectionType } from '@/features/presells-v2/sections/types.ts'

const ALL_TYPES = Object.keys(SECTION_LABELS) as SectionType[]

type SectionsManagerProps = {
  sections: Section[]
  onChange: (sections: Section[]) => void
}

function withNormalizedOrder(sections: Section[]): Section[] {
  return sections.map((s, i) => ({ ...s, order: i }) as Section)
}

export function SectionsManager({ sections, onChange }: SectionsManagerProps) {
  const ordered = [...sections].sort((a, b) => a.order - b.order)
  const availableTypes = ALL_TYPES.filter((t) => !ordered.some((s) => s.type === t))

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(withNormalizedOrder(next))
  }

  function remove(index: number) {
    onChange(withNormalizedOrder(ordered.filter((_, i) => i !== index)))
  }

  function add(type: SectionType) {
    onChange(withNormalizedOrder([...ordered, createDefaultSection(type, ordered.length)]))
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {ordered.map((section, index) => (
          <li key={`${section.type}-${section.order}`} className="flex items-center justify-between gap-2 rounded-md border border-input px-3 py-2">
            <span className="text-sm font-medium">{SECTION_LABELS[section.type]}</span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Mover ${SECTION_LABELS[section.type]} para cima`}>
                ↑
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} aria-label={`Mover ${SECTION_LABELS[section.type]} para baixo`}>
                ↓
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} aria-label={`Remover ${SECTION_LABELS[section.type]}`}>
                Remover
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            id="v2-add-section"
            defaultValue=""
            onChange={(e) => {
              const type = e.target.value as SectionType
              if (type) add(type)
              e.target.value = ''
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>Adicionar seção…</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>{SECTION_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
