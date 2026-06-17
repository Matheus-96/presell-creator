import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'

type FieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

export function Field({ id, label, value, onChange }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
