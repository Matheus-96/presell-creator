import { useEffect } from 'react'
import { useNavigate, useParams, useBlocker } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { MediaUploadField } from '@/features/presells/components/MediaUploadField.tsx'
import { PresellLivePreview } from '@/features/presells/components/PresellLivePreview.tsx'
import { TemplateSettingsFields } from '@/features/presells/components/TemplateSettingsFields.tsx'
import {
  buildPresellPayload,
  createEmptyPresellForm,
  createPresellForm,
  getTemplateById,
} from '@/features/presells/lib/presell-editor.ts'
import {
  createPresell,
  deletePresell,
  duplicatePresell,
  getApiErrorMessage,
  getPresell,
  listTemplates,
  updatePresell,
} from '@/features/presells/lib/presells-api.ts'
import type {
  MediaReference,
  PresellFormState,
  TemplateMetadata,
  TemplateSettingValue,
} from '@/features/presells/types.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

const presellFormSchema = z.object({
  id: z.number().nullable(),
  slug: z.string().min(1, 'Slug é obrigatório'),
  status: z.enum(['draft', 'published']),
  templateId: z.string().min(1),
  title: z.string().min(1, 'Título interno é obrigatório'),
  headline: z.string().min(1, 'Título é obrigatório'),
  subtitle: z.string(),
  body: z.string(),
  bulletsText: z.string(),
  ctaText: z.string().min(1, 'Texto do botão é obrigatório'),
  affiliateUrl: z.string().url('Insira uma URL válida'),
  googlePixelId: z.string(),
  trackingParam: z.string(),
  settings: z.record(z.string(), z.unknown()),
  media: z.object({
    heroImageFileName: z.string(),
    initialHeroImageFileName: z.string(),
    heroImageReference: z.any().nullable(),
    backgroundImageFileName: z.string(),
    initialBackgroundImageFileName: z.string(),
    backgroundImageReference: z.any().nullable(),
  }),
  urls: z.any().nullable(),
  timestamps: z.object({
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  }),
})

type PresellFormValues = z.infer<typeof presellFormSchema>

type EditorFormProps = {
  id: number | null
  templates: TemplateMetadata[]
  defaultValues: PresellFormState
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function PresellEditorForm({ id, templates, defaultValues }: EditorFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, formState } = useForm<PresellFormValues>({
    resolver: zodResolver(presellFormSchema),
    defaultValues,
  })

  const formValues = watch()
  const selectedTemplate = getTemplateById(templates, formValues.templateId)

  const blocker = useBlocker(formState.isDirty)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Descartar alterações não salvas?')) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  const saveMutation = useMutation({
    mutationFn: (values: PresellFormValues) => {
      const payload = buildPresellPayload(values as unknown as PresellFormState, selectedTemplate)
      return id ? updatePresell(id, payload) : createPresell(payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['presells'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['presell', id] })
        toast.success('Presell salvo')
      } else {
        navigate(`/presells/${saved.id}/edit`)
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar presell'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePresell(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presells'] })
      navigate('/presells')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir presell'))
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicatePresell(id!),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['presells'] })
      navigate(`/presells/${saved.id}/edit`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Erro ao duplicar presell'))
    },
  })

  function handleDelete() {
    if (!window.confirm('Excluir este presell permanentemente?')) return
    deleteMutation.mutate()
  }

  function handleHeroUpload(ref: MediaReference) {
    setValue('media.heroImageFileName', ref.fileName, { shouldDirty: true })
    setValue('media.heroImageReference', ref, { shouldDirty: true })
  }

  function handleHeroRemove() {
    setValue('media.heroImageFileName', '', { shouldDirty: true })
    setValue('media.heroImageReference', null, { shouldDirty: true })
  }

  function handleBackgroundUpload(ref: MediaReference) {
    setValue('media.backgroundImageFileName', ref.fileName, { shouldDirty: true })
    setValue('media.backgroundImageReference', ref, { shouldDirty: true })
  }

  function handleBackgroundRemove() {
    setValue('media.backgroundImageFileName', '', { shouldDirty: true })
    setValue('media.backgroundImageReference', null, { shouldDirty: true })
  }

  const isBusy = saveMutation.isPending || deleteMutation.isPending || duplicateMutation.isPending

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 py-3 border-b border-slate-200 bg-white">
        <PageHeader
          eyebrow="Editor de presell"
          title={
            id
              ? (formValues.title || formValues.headline || `Presell #${id}`)
              : 'Novo presell'
          }
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
          <FormSection title="Publicação">
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
          <FormSection
            title="Conteúdo"
            description="Textos exibidos na página de presell"
          >
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
          <FormSection title="Conversão">
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
                <Input
                  id="googlePixelId"
                  placeholder="Opcional"
                  {...register('googlePixelId')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trackingParam">Parâmetro de rastreamento</Label>
                <Input
                  id="trackingParam"
                  placeholder="gclid"
                  {...register('trackingParam')}
                />
                <p className="text-xs text-muted-foreground">
                  Nome do parâmetro passado para o link do afiliado. Use <code>sid</code> para CJ Affiliate e Braip, <code>src</code> para Hotmart e Eduzz, <code>tid</code> para ClickBank. Deixe em branco para usar <code>gclid</code>.
                </p>
              </div>
            </div>
          </FormSection>

          {/* Mídia */}
          <FormSection
            title="Mídia"
            description="Imagens usadas pelo template"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MediaUploadField
                label="Imagem do produto"
                reference={formValues.media.heroImageReference as MediaReference | null}
                onUpload={handleHeroUpload}
                onRemove={handleHeroRemove}
              />
              <MediaUploadField
                label="Imagem de fundo"
                reference={
                  formValues.media.backgroundImageReference as MediaReference | null
                }
                onUpload={handleBackgroundUpload}
                onRemove={handleBackgroundRemove}
              />
            </div>
          </FormSection>

          {/* Configurações do template */}
          <FormSection
            title="Configurações do template"
            description={selectedTemplate?.description}
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
        <div className="flex-[3] overflow-y-auto border-l border-slate-200">
          <PresellLivePreview
            draft={formValues as unknown as PresellFormState}
            template={selectedTemplate}
            detailStatus="idle"
            highlightSelector={null}
          />
        </div>
      </div>
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
