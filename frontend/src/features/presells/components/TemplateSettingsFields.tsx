import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import type { TemplateMetadata, TemplateSettingValue } from '@/features/presells/types.ts'
import { getDefaultFieldValue } from '@/features/presells/lib/presell-editor.ts'

type TemplateSettingsFieldsProps = {
  template: TemplateMetadata | null
  settings: Record<string, TemplateSettingValue>
  onChange: (fieldName: string, value: TemplateSettingValue) => void
}

export function TemplateSettingsFields({
  template,
  settings,
  onChange,
}: TemplateSettingsFieldsProps) {
  if (!template || template.fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este template não possui configurações extras.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {template.fields.map((field) => {
        const rawValue = settings[field.name] ?? getDefaultFieldValue(field)
        const inputId = `template-setting-${field.name}`

        if (field.type === 'textarea') {
          return (
            <div key={field.name} className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={inputId}>{field.label}</Label>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
              <textarea
                id={inputId}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                value={String(rawValue)}
                onChange={(e) => onChange(field.name, e.currentTarget.value)}
              />
            </div>
          )
        }

        if (field.type === 'select') {
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>{field.label}</Label>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
              <select
                id={inputId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={String(rawValue)}
                onChange={(e) => onChange(field.name, e.currentTarget.value)}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        if (field.type === 'checkbox') {
          return (
            <div key={field.name} className="flex items-center gap-2 py-1">
              <input
                id={inputId}
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={Boolean(rawValue)}
                onChange={(e) => onChange(field.name, e.currentTarget.checked)}
              />
              <Label htmlFor={inputId}>{field.label}</Label>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          )
        }

        if (field.type === 'range') {
          const numericValue = Number(rawValue)
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={inputId}>{field.label}</Label>
                <span className="text-sm font-medium tabular-nums">{numericValue}</span>
              </div>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
              <input
                id={inputId}
                type="range"
                className="w-full accent-primary"
                min={field.min ?? undefined}
                max={field.max ?? undefined}
                step={field.step ?? undefined}
                value={Number.isFinite(numericValue) ? numericValue : Number(field.min ?? 0)}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onChange(field.name, Number(e.currentTarget.value))
                }
              />
            </div>
          )
        }

        if (field.type === 'color') {
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>{field.label}</Label>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  id={inputId}
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-md border border-input p-1"
                  value={String(rawValue)}
                  onChange={(e) => onChange(field.name, e.currentTarget.value)}
                />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {String(rawValue)}
                </span>
              </div>
            </div>
          )
        }

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>{field.label}</Label>
            {field.helpText ? (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            ) : null}
            <Input
              id={inputId}
              value={String(rawValue)}
              onChange={(e) => onChange(field.name, e.currentTarget.value)}
            />
          </div>
        )
      })}
    </div>
  )
}
