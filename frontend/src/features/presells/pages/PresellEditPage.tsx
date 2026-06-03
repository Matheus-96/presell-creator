import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, ClipboardPaste, MoreHorizontal, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { FormSection } from '@/features/presells/components/FormSection.tsx'
import { AiJsonModal } from '@/features/presells/components/AiJsonModal.tsx'
import { MediaPicker } from '@/features/presells/components/MediaPicker.tsx'
import { ThemeEditor } from '@/features/presells/components/ThemeEditor.tsx'
import { PresellLivePreview } from '@/features/presells/components/PresellLivePreview.tsx'
import { TemplateSettingsFields } from '@/features/presells/components/TemplateSettingsFields.tsx'
import { EditorTabs, type TabId } from '@/features/presells/components/EditorTabs.tsx'
import { BenefitsList } from '@/features/presells/components/BenefitsList.tsx'
import { PublishReadinessBlock } from '@/features/presells/components/PublishReadinessBlock.tsx'
import { useTabValidation } from '@/features/presells/hooks/useTabValidation.ts'
import {
  createEmptyPresellForm,
  createPresellForm,
  getTemplateById,
} from '@/features/presells/lib/presell-editor.ts'
import { getPresell, listTemplates } from '@/features/presells/lib/presells-api.ts'
import { presellFormSchema } from '@/features/presells/lib/presell-form-schema.ts'
import type { PresellFormValues } from '@/features/presells/lib/presell-form-schema.ts'
import { usePresellEditor } from '@/features/presells/hooks/usePresellEditor.ts'
import type {
  PresellFormState,
  TemplateMetadata,
  TemplateSettingValue,
} from '@/features/presells/types.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

type EditorFormProps = {
  id: number | null
  templates: TemplateMetadata[]
  defaultValues: PresellFormState
}

function PresellEditorForm({ id, templates, defaultValues }: EditorFormProps) {
  const navigate = useNavigate()

  const { register, handleSubmit, watch, setValue, formState } =
    useForm<PresellFormValues>({
      resolver: zodResolver(presellFormSchema),
      defaultValues,
    })

  // Bug fix: RHF's formState.isDirty can produce false positives — it fires when
  // the deep-equality comparison of the entire form state vs defaultValues fails
  // due to object reference changes (e.g. after the resolver normalises the
  // `settings` or `media` objects on mount, or when switching templates). We
  // derive a reliable "has the user actually edited anything?" signal from two
  // sources that are each individually trustworthy:
  //
  //   1. formState.dirtyFields — populated field-by-field only when a registered
  //      <input> value actually diverges from its defaultValue. Per-field dirty
  //      tracking does NOT suffer from the cross-field object-reference problem.
  //
  //   2. userHasEdited ref — set to true whenever setValue() is called. All
  //      non-registered (controlled) fields (settings, media, theme) are updated
  //      exclusively via setValue, so this ref captures every user-initiated
  //      change to those fields.
  //
  // Together they give us a signal that is false until the user deliberately
  // edits at least one field.
  const userHasEdited = useRef(false)

  // Wrap setValue so every explicit set marks the form as edited.
  const setValueAndMarkEdited: typeof setValue = (name, value, options) => {
    userHasEdited.current = true
    return setValue(name, value, options)
  }

  const hasUserEdits = userHasEdited.current || Object.keys(formState.dirtyFields).length > 0

  const formValues = watch()
  const selectedTemplate = getTemplateById(templates, formValues.templateId)

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('content')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const tabValidity = useTabValidation(formState.errors, formValues)

  const {
    saveMutation,
    deleteMutation,
    duplicateMutation,
    isBusy,
    handleDelete,
  } = usePresellEditor({ id, isDirty: hasUserEdits, selectedTemplate })

  const presellTitle = formValues.title || formValues.headline || (id ? `Presell #${id}` : 'Novo presell')

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white">
        {/* Row 1: nav + actions */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => navigate('/presells')}
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para Presells
          </Button>

          <div className="flex items-center gap-2">
            {/* Save status indicator */}
            <span className="text-sm text-muted-foreground select-none">
              {hasUserEdits ? 'Alterações não salvas' : 'Rascunho salvo'}
            </span>

            {/* Salvar rascunho */}
            <Button
              type="submit"
              form="presell-editor-form"
              size="sm"
              variant="outline"
              disabled={isBusy}
            >
              {saveMutation.isPending ? 'Salvando…' : 'Salvar rascunho'}
            </Button>

            {/* Publicar página */}
            <Button
              type="button"
              size="sm"
              disabled={isBusy}
              onClick={() => {
                setValueAndMarkEdited('status', 'published', { shouldDirty: true })
                handleSubmit(
                  (values) => saveMutation.mutate(values),
                  () => toast.error('Corrija os campos obrigatórios antes de publicar'),
                )()
              }}
            >
              Publicar página
            </Button>

            {/* "..." more menu — only when editing an existing presell */}
            {id ? (
              <div style={{ position: 'relative' }}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => setMoreMenuOpen((v) => !v)}
                  aria-label="Mais opções"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>

                {moreMenuOpen && (
                  <>
                    {/* Backdrop to close on outside click */}
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10,
                      }}
                      onClick={() => setMoreMenuOpen(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 4px)',
                        zIndex: 20,
                        background: 'white',
                        border: '1px solid rgba(148,163,184,0.3)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        minWidth: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setMoreMenuOpen(false)
                          duplicateMutation.mutate()
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          color: 'var(--p-text)',
                        }}
                      >
                        {duplicateMutation.isPending ? 'Duplicando…' : 'Duplicar'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setMoreMenuOpen(false)
                          handleDelete()
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.875rem',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          color: '#dc2626',
                        }}
                      >
                        {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Row 2: eyebrow */}
        <div className="px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            Editor de presell
          </p>
        </div>

        {/* Row 3: title */}
        <div className="px-6 pb-3">
          <h1 className="text-xl font-semibold leading-tight">{presellTitle}</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Form column */}
        <form
          id="presell-editor-form"
          className="flex-[7] overflow-y-auto flex flex-col"
          onSubmit={handleSubmit(
            (values) => saveMutation.mutate(values),
            () => toast.error('Corrija os campos obrigatórios antes de salvar'),
          )}
        >
          {/* Tab navigation */}
          <div className="shrink-0 px-6 pt-3">
            <EditorTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabValidity={tabValidity}
            />
          </div>

          {/* Tab content */}
          <div className="flex-1 px-6 py-4 flex flex-col gap-4">

            {/* ── Tab: Conteúdo ── */}
            {activeTab === 'content' && (
              <>
                {/* Template */}
                <FormSection title="Template" description="Escolha o layout da página de presell" collapsible defaultOpen={true}>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="templateId">Template</Label>
                    <select
                      id="templateId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...register('templateId')}
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormSection>

                {/* Conteúdo da página */}
                <FormSection
                  title="Conteúdo da página"
                  description="Os textos que aparecem para o visitante"
                  collapsible
                  defaultOpen={true}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="headline">
                        Título principal <span className="text-destructive">*</span>
                      </Label>
                      <Input id="headline" {...register('headline')} />
                      {formState.errors.headline && (
                        <p className="text-sm text-destructive">{formState.errors.headline.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="subtitle">Subtítulo</Label>
                      <Input id="subtitle" {...register('subtitle')} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="body">Corpo do texto</Label>
                      <textarea
                        id="body"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={6}
                        {...register('body')}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label>Benefícios</Label>
                      <BenefitsList
                        value={watch('bulletsText')}
                        onChange={(val) =>
                          setValueAndMarkEdited('bulletsText', val, { shouldDirty: true })
                        }
                        disabled={isBusy}
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Configurações do template */}
                <FormSection
                  title="Configurações do template"
                  description={selectedTemplate?.description}
                  collapsible
                  defaultOpen={true}
                  action={
                    selectedTemplate?.aiInstructions ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto shrink-0 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTemplate.aiInstructions!)
                            toast.success('Instruções copiadas')
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copiar instruções
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto shrink-0 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => setAiModalOpen(true)}
                        >
                          <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                          Preencher com JSON
                        </Button>
                      </div>
                    ) : null
                  }
                >
                  <TemplateSettingsFields
                    settings={formValues.settings as Record<string, TemplateSettingValue>}
                    template={selectedTemplate}
                    onChange={(fieldName, value) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setValueAndMarkEdited(`settings.${fieldName}` as any, value, { shouldDirty: true })
                    }}
                  />
                </FormSection>
              </>
            )}

            {/* ── Tab: Visual ── */}
            {activeTab === 'visual' && (
              <FormSection
                title="Visual da página"
                description="Imagens e cores"
                collapsible
                defaultOpen={true}
              >
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MediaPicker
                      label="Imagem em destaque (Herói)"
                      value={watch('media.heroImageReference')}
                      onChange={(ref) => {
                        setValueAndMarkEdited('media.heroImageReference', ref, { shouldDirty: true })
                        setValueAndMarkEdited('media.heroImageFileName', ref?.fileName ?? '', { shouldDirty: true })
                      }}
                      isLoading={isBusy}
                    />
                    <MediaPicker
                      label="Imagem de fundo"
                      value={watch('media.backgroundImageReference')}
                      onChange={(ref) => {
                        setValueAndMarkEdited('media.backgroundImageReference', ref, { shouldDirty: true })
                        setValueAndMarkEdited('media.backgroundImageFileName', ref?.fileName ?? '', { shouldDirty: true })
                      }}
                      isLoading={isBusy}
                    />
                  </div>
                  <ThemeEditor
                    theme={formValues.theme}
                    onChange={(newTheme) =>
                      setValueAndMarkEdited('theme', newTheme, { shouldDirty: true })
                    }
                  />
                </div>
              </FormSection>
            )}

            {/* ── Tab: Conversão ── */}
            {activeTab === 'conversion' && (
              <FormSection
                title="Conversão"
                description="Para onde o visitante vai ao clicar"
                collapsible
                defaultOpen={true}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ctaText">
                      Texto do botão <span className="text-destructive">*</span>
                    </Label>
                    <Input id="ctaText" {...register('ctaText')} />
                    {formState.errors.ctaText && (
                      <p className="text-sm text-destructive">{formState.errors.ctaText.message}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="affiliateUrl">Link de destino</Label>
                    <Input
                      id="affiliateUrl"
                      type="url"
                      placeholder="https://exemplo.com/oferta"
                      {...register('affiliateUrl')}
                    />
                    {formState.errors.affiliateUrl && (
                      <p className="text-sm text-destructive">
                        {formState.errors.affiliateUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="googlePixelId">ID do pixel Google</Label>
                    <Input id="googlePixelId" placeholder="Opcional" {...register('googlePixelId')} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="trackingParam">Parâmetro de rastreamento</Label>
                    <Input id="trackingParam" placeholder="gclid" {...register('trackingParam')} />
                    <p className="text-xs text-muted-foreground">
                      Nome do parâmetro passado para o link do afiliado. Use <code>sid</code> para CJ
                      Affiliate e Braip, <code>src</code> para Hotmart e Eduzz, <code>tid</code> para
                      ClickBank. Deixe em branco para usar <code>gclid</code>.
                    </p>
                  </div>
                </div>
              </FormSection>
            )}

            {/* ── Tab: Publicar ── */}
            {activeTab === 'publish' && (
              <>
                <FormSection
                  title="Publicar"
                  description="Endereço da página e quando ela fica disponível"
                  collapsible
                  defaultOpen={true}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label htmlFor="slug">
                        Endereço da página (slug) <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-0">
                        <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
                          presell.../
                        </span>
                        <Input
                          id="slug"
                          placeholder="meu-presell"
                          className="rounded-l-none"
                          {...register('slug')}
                        />
                      </div>
                      {formState.errors.slug && (
                        <p className="text-sm text-destructive">{formState.errors.slug.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="title">Título interno</Label>
                      <Input
                        id="title"
                        placeholder="Para organização interna"
                        {...register('title')}
                      />
                      {formState.errors.title && (
                        <p className="text-sm text-destructive">{formState.errors.title.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...register('status')}
                      >
                        <option value="draft">Rascunho</option>
                        <option value="published">Publicado</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label htmlFor="legalText">
                        Aviso legal{' '}
                        <span className="text-xs font-normal text-muted-foreground">(rodapé)</span>
                      </Label>
                      <textarea
                        id="legalText"
                        className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Ex: Este conteúdo tem caráter promocional. Deixe vazio para ocultar."
                        {...register('legalText')}
                      />
                    </div>
                  </div>
                </FormSection>

                <PublishReadinessBlock
                  errors={formState.errors}
                  values={formValues}
                  onNavigateToTab={setActiveTab}
                  onPublish={() => {
                    setValueAndMarkEdited('status', 'published', { shouldDirty: true })
                    handleSubmit(
                      (values) => saveMutation.mutate(values),
                      () => toast.error('Corrija os campos obrigatórios antes de publicar'),
                    )()
                  }}
                  isBusy={isBusy}
                />
              </>
            )}
          </div>
        </form>

        {/* Preview column */}
        <div className="flex-[3] overflow-hidden border-l border-slate-200">
          <PresellLivePreview
            draft={formValues as unknown as PresellFormState}
            template={selectedTemplate}
            detailStatus="idle"
            highlightSelector={null}
          />
        </div>
      </div>

      <AiJsonModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        selectedTemplate={selectedTemplate}
        setValue={setValueAndMarkEdited}
      />
    </div>
  )
}

export function PresellEditPage() {
  useDocumentTitle('Editar Presell')

  const { id: idParam } = useParams<{ id: string }>()
  const id = idParam ? Number(idParam) : null

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
    staleTime: 60_000,
  })

  const presellQuery = useQuery({
    queryKey: ['presell', id],
    queryFn: () => getPresell(id!),
    enabled: id !== null,
    staleTime: 0,
  })

  const isLoading = templatesQuery.isPending || (id !== null && presellQuery.isPending)

  if (isLoading) {
    return (
      <div className="page">
        <PageHeader eyebrow="Editor de presell" title="Carregando…" />
      </div>
    )
  }

  if (templatesQuery.isError) {
    return (
      <div className="page">
        <PageHeader eyebrow="Editor de presell" title="Erro ao carregar templates" />
      </div>
    )
  }

  const templates = templatesQuery.data.items
  const defaultValues =
    id !== null && presellQuery.data
      ? createPresellForm(
          presellQuery.data,
          getTemplateById(templates, presellQuery.data.templateId),
        )
      : createEmptyPresellForm(getTemplateById(templates, 'offer-modal'))

  return (
    <PresellEditorForm
      key={id ?? 'new'}
      id={id}
      templates={templates}
      defaultValues={defaultValues}
    />
  )
}
