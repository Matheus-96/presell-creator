import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import {
  getPresellV2ById,
  updatePresellV2,
} from '@/features/presells-v2/lib/presells-v2-api.ts'
import { SectionsPreview } from '@/features/presells-v2/components/SectionsPreview.tsx'
import { ModalShell } from '@/features/presells-v2/components/ModalShell.tsx'
import { ConfirmRemoveModal } from '@/features/presells-v2/components/ConfirmRemoveModal.tsx'
import { Field } from '@/features/presells-v2/components/Field.tsx'
import { FooterEditor } from '@/features/presells-v2/sections/footer/FooterEditor.tsx'
import type {
  FaqItem,
  FaqProps,
  FooterProps,
  HeroProps,
  Section,
  TestimonialItem,
  TestimonialsProps,
} from '@/features/presells-v2/sections/types.ts'

type HeroSection = Extract<Section, { type: 'hero' }>
type FaqSection = Extract<Section, { type: 'faq' }>
type TestimonialsSection = Extract<Section, { type: 'testimonials' }>
type FooterSection = Extract<Section, { type: 'footer' }>

function findIndex(sections: Section[], type: Section['type']): number {
  return sections.findIndex((s) => s.type === type)
}

function updateHero(
  sections: Section[],
  patch: Partial<HeroProps>,
): Section[] {
  const i = findIndex(sections, 'hero')
  if (i < 0) return sections
  const next = [...sections]
  const current = next[i] as HeroSection
  next[i] = { ...current, props: { ...current.props, ...patch } }
  return next
}

function updateFaq(
  sections: Section[],
  patch: Partial<FaqProps>,
): Section[] {
  const i = findIndex(sections, 'faq')
  if (i < 0) return sections
  const next = [...sections]
  const current = next[i] as FaqSection
  next[i] = { ...current, props: { ...current.props, ...patch } }
  return next
}

function updateTestimonials(
  sections: Section[],
  patch: Partial<TestimonialsProps>,
): Section[] {
  const i = findIndex(sections, 'testimonials')
  if (i < 0) return sections
  const next = [...sections]
  const current = next[i] as TestimonialsSection
  next[i] = { ...current, props: { ...current.props, ...patch } }
  return next
}

function updateFooter(
  sections: Section[],
  patch: Partial<FooterProps>,
): Section[] {
  const i = findIndex(sections, 'footer')
  if (i < 0) return sections
  const next = [...sections]
  const current = next[i] as FooterSection
  next[i] = { ...current, props: { ...current.props, ...patch } }
  return next
}

export function PresellsV2EditPage() {
  useDocumentTitle('Editar Presell V2')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['presells-v2', id],
    queryFn: () => getPresellV2ById(id as string),
    enabled: Boolean(id),
  })

  const [sections, setSections] = useState<Section[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (data) setSections(data.sections)
  }, [data])

  if (isError) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Presells V2"
          title="Editar Presell V2"
          description="Edite as seções da página V2 e visualize o resultado em tempo real."
        />
        <StatusBanner
          tone="warning"
          title="Não foi possível carregar o presell V2"
          description={
            error instanceof Error ? error.message : 'Tente recarregar a página.'
          }
        />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Presells V2"
          title="Editar Presell V2"
          description="Edite as seções da página V2 e visualize o resultado em tempo real."
        />
        <SectionCard eyebrow="Edição" title="Carregando…">
          <p className="text-sm text-muted-foreground py-4">
            Carregando presell V2…
          </p>
        </SectionCard>
      </div>
    )
  }

  const hero = sections.find(
    (s): s is HeroSection => s.type === 'hero',
  )
  const faq = sections.find((s): s is FaqSection => s.type === 'faq')
  const testimonials = sections.find(
    (s): s is TestimonialsSection => s.type === 'testimonials',
  )
  const footer = sections.find(
    (s): s is FooterSection => s.type === 'footer',
  )

  async function handleSave() {
    if (!id || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await updatePresellV2(id, { sections })
      navigate('/presells-v2')
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presells V2"
        title="Editar Presell V2"
        description="Edite as seções da página V2 e visualize o resultado em tempo real."
      />

      <SectionCard eyebrow="Identificação" title="Slug da página">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-edit-slug">Slug</Label>
          <Input id="v2-edit-slug" value={data.slug} readOnly />
          <p className="text-xs text-slate-500">
            A página fica disponível em <code>/lp/{data.slug}</code>.
          </p>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {hero && (
            <HeroEditor
              props={hero.props}
              onChange={(patch) => setSections((s) => updateHero(s, patch))}
            />
          )}
          {faq && (
            <FaqEditor
              props={faq.props}
              onChange={(patch) => setSections((s) => updateFaq(s, patch))}
            />
          )}
          {testimonials && (
            <TestimonialsEditor
              props={testimonials.props}
              onChange={(patch) =>
                setSections((s) => updateTestimonials(s, patch))
              }
            />
          )}
          {footer && (
            <FooterEditor
              props={footer.props}
              onChange={(patch) => setSections((s) => updateFooter(s, patch))}
            />
          )}

          <SectionCard eyebrow="Publicação" title="Salvar alterações">
            <div className="flex flex-col gap-3">
              {saveError && (
                <p role="alert" className="text-sm text-red-600">
                  {saveError}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-3">
          <SectionCard
            eyebrow="Preview"
            title="Visualização da página"
            description="Mesma renderização da página pública (`/lp/:slug`)."
          >
            <SectionsPreview sections={sections} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

type HeroEditorProps = {
  props: HeroProps
  onChange: (patch: Partial<HeroProps>) => void
}

function HeroEditor({ props, onChange }: HeroEditorProps) {
  return (
    <SectionCard eyebrow="Seção" title="Hero">
      <div className="flex flex-col gap-3">
        <Field
          id="v2-hero-headline"
          label="Headline"
          value={props.headline}
          onChange={(v) => onChange({ headline: v })}
        />
        <Field
          id="v2-hero-subtitle"
          label="Subtítulo"
          value={props.subtitle}
          onChange={(v) => onChange({ subtitle: v })}
        />
        <Field
          id="v2-hero-cta-text"
          label="Texto do CTA"
          value={props.ctaText}
          onChange={(v) => onChange({ ctaText: v })}
        />
        <Field
          id="v2-hero-cta-url"
          label="URL de afiliado"
          value={props.ctaUrl}
          onChange={(v) => onChange({ ctaUrl: v })}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-hero-bg">Cor de fundo</Label>
          <div className="flex items-center gap-2">
            <input
              id="v2-hero-bg-picker"
              type="color"
              aria-label="Selecionar cor de fundo"
              value={props.bgColor || '#ffffff'}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-10 w-12 cursor-pointer rounded border border-input"
            />
            <Input
              id="v2-hero-bg"
              value={props.bgColor || ''}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

type FaqEditorProps = {
  props: FaqProps
  onChange: (patch: Partial<FaqProps>) => void
}

function FaqEditor({ props, onChange }: FaqEditorProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  function handleAdd(item: FaqItem) {
    onChange({ items: [...(props.items || []), item] })
    setAddOpen(false)
  }

  function handleConfirmRemove() {
    if (removeIndex === null) return
    const next = (props.items || []).filter((_, i) => i !== removeIndex)
    onChange({ items: next })
    setRemoveIndex(null)
  }

  return (
    <SectionCard eyebrow="Seção" title="FAQ">
      <div className="flex flex-col gap-3">
        <Field
          id="v2-faq-title"
          label="Título"
          value={props.title}
          onChange={(v) => onChange({ title: v })}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Perguntas</span>
          <ul className="flex flex-col gap-2">
            {(props.items || []).map((item, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {item.question}
                  </p>
                  <p className="text-xs text-slate-600">{item.answer}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remover pergunta"
                  onClick={() => setRemoveIndex(idx)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            Adicionar pergunta
          </Button>
        </div>
      </div>

      {addOpen && (
        <AddFaqModal onCancel={() => setAddOpen(false)} onConfirm={handleAdd} />
      )}
      {removeIndex !== null && (
        <ConfirmRemoveModal
          message="Tem certeza que deseja remover esta pergunta?"
          onCancel={() => setRemoveIndex(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </SectionCard>
  )
}

type TestimonialsEditorProps = {
  props: TestimonialsProps
  onChange: (patch: Partial<TestimonialsProps>) => void
}

function TestimonialsEditor({ props, onChange }: TestimonialsEditorProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  function handleAdd(item: TestimonialItem) {
    onChange({ items: [...(props.items || []), item] })
    setAddOpen(false)
  }

  function handleConfirmRemove() {
    if (removeIndex === null) return
    const next = (props.items || []).filter((_, i) => i !== removeIndex)
    onChange({ items: next })
    setRemoveIndex(null)
  }

  return (
    <SectionCard eyebrow="Seção" title="Depoimentos">
      <div className="flex flex-col gap-3">
        <Field
          id="v2-test-title"
          label="Título"
          value={props.title}
          onChange={(v) => onChange({ title: v })}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Depoimentos</span>
          <ul className="flex flex-col gap-2">
            {(props.items || []).map((item, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {item.name}
                    {item.role ? ` — ${item.role}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">{item.text}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remover depoimento"
                  onClick={() => setRemoveIndex(idx)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            Adicionar depoimento
          </Button>
        </div>
      </div>

      {addOpen && (
        <AddTestimonialModal
          onCancel={() => setAddOpen(false)}
          onConfirm={handleAdd}
        />
      )}
      {removeIndex !== null && (
        <ConfirmRemoveModal
          message="Tem certeza que deseja remover este depoimento?"
          onCancel={() => setRemoveIndex(null)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </SectionCard>
  )
}

type AddFaqModalProps = {
  onCancel: () => void
  onConfirm: (item: FaqItem) => void
}

function AddFaqModal({ onCancel, onConfirm }: AddFaqModalProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm({ question: question.trim(), answer: answer.trim() })
  }

  const canSubmit = question.trim().length > 0 && answer.trim().length > 0

  return (
    <ModalShell title="Adicionar pergunta" onCancel={onCancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="faq-question">Pergunta</Label>
          <Input
            id="faq-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="faq-answer">Resposta</Label>
          <Input
            id="faq-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Adicionar
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

type AddTestimonialModalProps = {
  onCancel: () => void
  onConfirm: (item: TestimonialItem) => void
}

function AddTestimonialModal({ onCancel, onConfirm }: AddTestimonialModalProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [text, setText] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm({
      name: name.trim(),
      role: role.trim(),
      text: text.trim(),
      avatarUrl: null,
    })
  }

  const canSubmit = name.trim().length > 0 && text.trim().length > 0

  return (
    <ModalShell title="Adicionar depoimento" onCancel={onCancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-name">Nome</Label>
          <Input
            id="test-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-role">Cargo</Label>
          <Input
            id="test-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-text">Depoimento</Label>
          <Input
            id="test-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Adicionar
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

export default PresellsV2EditPage
