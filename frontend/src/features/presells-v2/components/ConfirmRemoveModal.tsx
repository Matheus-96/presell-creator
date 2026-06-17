import { Button } from '@/components/ui/button.tsx'
import { ModalShell } from '@/features/presells-v2/components/ModalShell.tsx'

type ConfirmRemoveModalProps = {
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmRemoveModal({
  message,
  onCancel,
  onConfirm,
}: ConfirmRemoveModalProps) {
  return (
    <ModalShell title="Remover item" onCancel={onCancel}>
      <p className="text-sm text-slate-700">{message}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          Confirmar
        </Button>
      </div>
    </ModalShell>
  )
}
