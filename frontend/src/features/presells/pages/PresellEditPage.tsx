import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, ClipboardPaste } from 'lucide-react'
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

  const { register, handleSubmit, watch, setValue, formState } = useForm<PresellFormValues>({
    resolver: zodResolver(presellFormSchema),
    defaultValues,
  })

  const formValues = watch()
  const selectedTemplate = getTemplateById(templates, formValues.templateId)

  const [aiModalOpen, setAiModalOpen] = useState(false)

  const {
    saveMutation,
    deleteMutation,
    duplicateMutation,
    isBusy,
    handleDelete,
  } = usePresellEditor({ id, isDirty: formState.isDirty, selectedTemplate, setValue })

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 py-3 border-b border-slate-200 bg-white">
        <PageHeader
          eyebrow="Editor de presell"
          title={id ? (formValues.title || formValues.headline || `Presell #${id}`) : 'Novo presell'}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Form column */}
        <form
          className="flex-[7] overflow-y-auto px-6 py-4 flex flex-col gap-4"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="submit" disabled={isBusy}>
              {saveMutation.isPending ? 'Salvando…' : id ? 'Salvar' : 'Criar presell'}
            </Button>
            {id ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => duplicateMutation.mutate()}
                >
                  {duplicateMutation.isPending ? 'Duplicando…' : 'Duplicar'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={handleDelete}
                >
                  {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => navigate('/presells')}>
              Voltar
            </Button>
          </div>

          {/* Publicação */}
          <FormSection title="Publicação" collapsible defaultOpen={true}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" placeholder="meu-presell" {...register('slug')} />
                {formState.errors.slug && (
                  <p className="text-sm text-destructive">{formState.errors.slug.message}</p>
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Título interno</Label>
                <Input id="title" placeholder="Para organização interna" {...register('title')} />
                {formState.errors.title && (
                  <p className="text-sm text-destructive">{formState.errors.title.message}</p>
                )}
              </div>
            </div>
          </FormSection>

          {/* Conteúdo */}
          <FormSection title="Conteúdo" description="Textos exibidos na página de presell" collapsible defaultOpen={true}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="headline">Título</Label>
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
                <Label htmlFor="bulletsText">Benefícios</Label>
                <textarea
                  id="bulletsText"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Um benefício por linha"
                  {...register('bulletsText')}
                />
              </div>
            </div>
          </FormSection>

          {/* Conversão */}
          <FormSection title="Conversão" collapsible defaultOpen={true}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ctaText">Texto do botão</Label>
                <Input id="ctaText" {...register('ctaText')} />
                {formState.errors.ctaText && (
                  <p className="text-sm text-destructive">{formState.errors.ctaText.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="affiliateUrl">URL de destino</Label>
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

          {/* Mídia */}
          <FormSection title="Mídia" description="Imagens usadas pelo template" collapsible defaultOpen={false}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MediaPicker
                label="Imagem do herói"
                value={watch('media.heroImageReference')}
                onChange={(ref) => {
                  setValue('media.heroImageReference', ref, { shouldDirty: true })
                  setValue('media.heroImageFileName', ref?.fileName ?? '', { shouldDirty: true })
                }}
                isLoading={isBusy}
              />
              <MediaPicker
                label="Imagem de fundo"
                value={watch('media.backgroundImageReference')}
                onChange={(ref) => {
                  setValue('media.backgroundImageReference', ref, { shouldDirty: true })
                  setValue('media.backgroundImageFileName', ref?.fileName ?? '', { shouldDirty: true })
                }}
                isLoading={isBusy}
              />
            </div>
          </FormSection>

          {/* Tema Visual */}
          <FormSection title="Tema Visual" description="Cores da identidade visual do produto" collapsible defaultOpen={false}>
            <ThemeEditor
              theme={formValues.theme}
              onChange={(newTheme) => setValue('theme', newTheme, { shouldDirty: true })}
            />
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
                setValue(`settings.${fieldName}` as any, value, { shouldDirty: true })
              }}
            />
          </FormSection>
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
        setValue={setValue}
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
