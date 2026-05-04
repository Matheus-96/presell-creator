import { SectionCard } from '@/components/ui/SectionCard.tsx'

type MigrationNoticeProps = {
  nowItems: string[]
  laterItems: string[]
}

export function MigrationNotice({
  nowItems,
  laterItems,
}: MigrationNoticeProps) {
  return (
    <div className="page-grid page-grid--two-up">
      <SectionCard
        eyebrow="Current scope"
        title="What ships in this bootstrap"
        description="Enough structure to start the admin migration cleanly."
      >
        <ul className="list">
          {nowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        eyebrow="Future evolution"
        title="What this can grow into"
        description="The route and folder layout support broader template work when the roadmap calls for it."
      >
        <ul className="list">
          {laterItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
