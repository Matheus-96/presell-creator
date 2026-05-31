import { useEffect } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createPresell,
  deletePresell,
  duplicatePresell,
  getApiErrorMessage,
  updatePresell,
} from '@/features/presells/lib/presells-api.ts'
import { buildPresellPayload } from '@/features/presells/lib/presell-editor.ts'
import type { PresellFormState, TemplateMetadata } from '@/features/presells/types.ts'
import type { PresellFormValues } from '@/features/presells/lib/presell-form-schema.ts'

type Props = {
  id: number | null
  isDirty: boolean
  selectedTemplate: TemplateMetadata | null | undefined
}

export function usePresellEditor({ id, isDirty, selectedTemplate }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const blocker = useBlocker(isDirty)

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
      const payload = buildPresellPayload(values as unknown as PresellFormState, selectedTemplate ?? null)
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

  const isBusy = saveMutation.isPending || deleteMutation.isPending || duplicateMutation.isPending

  return {
    saveMutation,
    deleteMutation,
    duplicateMutation,
    isBusy,
    handleDelete,
  }
}
