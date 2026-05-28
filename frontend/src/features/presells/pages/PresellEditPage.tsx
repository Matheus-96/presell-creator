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
  getPresell,
  listTemplates,
  updatePresell,
} from '@/features/presells/lib/presells-api.ts'
import type {
  PresellFormState,
  TemplateMetadata,
  TemplateSettingValue,
} from '@/features/presells/types.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

const presellFormSchema = z.object({
  id: z.number().nullable(),
  slug: z.string().min(1, 'Slug is required'),
  status: z.enum(['draft', 'published']),
  templateId: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  headline: z.string().min(1, 'Headline is required'),
  subtitle: z.string(),
  body: z.string(),
  bulletsText: z.string(),
  ctaText: z.string().min(1, 'CTA text is required'),
  affiliateUrl: z.string().url('Enter a valid URL'),
  googlePixelId: z.string(),
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
      if (window.confirm('Discard unsaved changes?')) {
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
        toast.success('Presell updated')
      } else {
        navigate(`/presells/${saved.id}/edit`)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePresell(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presells'] })
      navigate('/presells')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicatePresell(id!),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['presells'] })
      navigate(`/presells/${saved.id}/edit`)
    },
  })

  function handleDelete() {
    if (!window.confirm('Delete this presell permanently?')) return
    deleteMutation.mutate()
  }

  const isBusy = saveMutation.isPending || deleteMutation.isPending || duplicateMutation.isPending

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 py-3 border-b border-slate-200 bg-white">
        <PageHeader
          eyebrow="Presell editor"
          title={
            id
              ? (formValues.title || formValues.headline || `Presell #${id}`)
              : 'Create a new presell'
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Form column — 70% */}
        <form
          className="flex-[7] overflow-y-auto px-6 py-4 flex flex-col gap-6"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        >
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="submit" disabled={isBusy}>
              {saveMutation.isPending ? 'Saving…' : id ? 'Save changes' : 'Create presell'}
            </Button>
            {id ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => duplicateMutation.mutate()}
                >
                  {duplicateMutation.isPending ? 'Duplicating…' : 'Duplicate'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={handleDelete}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => navigate('/presells')}>
              Back
            </Button>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="my-presell" {...register('slug')} />
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
                <option value="draft">Draft</option>
                <option value="published">Published</option>
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
              <Label htmlFor="title">Internal title</Label>
              <Input id="title" {...register('title')} />
              {formState.errors.title && (
                <p className="text-sm text-destructive">{formState.errors.title.message}</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" {...register('headline')} />
              {formState.errors.headline && (
                <p className="text-sm text-destructive">{formState.errors.headline.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input id="subtitle" {...register('subtitle')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">Body</Label>
              <textarea
                id="body"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={6}
                {...register('body')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulletsText">Bullets / benefits</Label>
              <textarea
                id="bulletsText"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={4}
                placeholder="One benefit per line"
                {...register('bulletsText')}
              />
            </div>
          </div>

          {/* Conversion */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ctaText">CTA text</Label>
              <Input id="ctaText" {...register('ctaText')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="affiliateUrl">Affiliate URL</Label>
              <Input
                id="affiliateUrl"
                type="url"
                placeholder="https://example.com/offer"
                {...register('affiliateUrl')}
              />
              {formState.errors.affiliateUrl && (
                <p className="text-sm text-destructive">{formState.errors.affiliateUrl.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="googlePixelId">Google pixel ID</Label>
              <Input id="googlePixelId" placeholder="Optional" {...register('googlePixelId')} />
            </div>
          </div>

          {/* Media */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="heroImageFileName">Hero image file name</Label>
              <Input
                id="heroImageFileName"
                placeholder="image.webp"
                {...register('media.heroImageFileName')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="backgroundImageFileName">Background image file name</Label>
              <Input
                id="backgroundImageFileName"
                placeholder="background.webp"
                {...register('media.backgroundImageFileName')}
              />
            </div>
          </div>

          {/* Template settings */}
          <TemplateSettingsFields
            settings={formValues.settings as Record<string, TemplateSettingValue>}
            template={selectedTemplate}
            onChange={(fieldName, value) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setValue(`settings.${fieldName}` as any, value, { shouldDirty: true })
            }}
          />
        </form>

        {/* Preview column — 30% */}
        <div className="flex-[3] overflow-y-auto border-l border-slate-200">
          <PresellLivePreview
            draft={formValues as unknown as PresellFormState}
            template={selectedTemplate}
            detailStatus="idle"
          />
        </div>
      </div>
    </div>
  )
}

export function PresellEditPage() {
  useDocumentTitle('Edit Presell')

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
        <PageHeader eyebrow="Presell editor" title="Loading…" />
      </div>
    )
  }

  if (templatesQuery.isError) {
    return (
      <div className="page">
        <PageHeader eyebrow="Presell editor" title="Failed to load templates" />
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
      : createEmptyPresellForm(getTemplateById(templates, 'advertorial'))

  return (
    <PresellEditorForm
      key={id ?? 'new'}
      id={id}
      templates={templates}
      defaultValues={defaultValues}
    />
  )
}
