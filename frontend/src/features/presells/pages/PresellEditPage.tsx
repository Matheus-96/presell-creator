import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

export function PresellEditPage() {
  useDocumentTitle('Edit Presell')

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presell editor"
        title="Coming soon"
        description="Editor será implementado no issue #16."
      />
    </div>
  )
}
