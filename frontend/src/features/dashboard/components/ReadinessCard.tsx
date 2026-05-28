import { SectionCard } from '@/components/ui/SectionCard.tsx'

type ReadinessCardProps = {
  title: string
  items: string[]
}

export function ReadinessCard({ title, items }: ReadinessCardProps) {
  return (
    <SectionCard
      eyebrow="Scaffold status"
      title={title}
      description="The foundations are in place without locking the project into backend contracts too early."
    >
      <ul className="list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </SectionCard>
  )
}
