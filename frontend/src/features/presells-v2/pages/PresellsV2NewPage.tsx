import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

export function PresellsV2NewPage() {
  useDocumentTitle('Novo Presell V2')

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presells V2"
        title="Novo Presell V2"
        description="Editor completo será entregue no próximo slice."
      />

      <SectionCard eyebrow="Em construção" title="Editor de Presell V2">
        <p className="text-sm text-muted-foreground py-4">
          A página de edição completa (formulário → IA → preview → salvar) será
          implementada no próximo slice. Por enquanto, este é o ponto de entrada
          reservado da navegação.
        </p>
      </SectionCard>
    </div>
  )
}
