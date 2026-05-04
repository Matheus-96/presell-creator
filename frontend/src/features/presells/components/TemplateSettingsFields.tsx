import type { ChangeEvent } from 'react'
import type {
  TemplateMetadata,
  TemplateSettingValue,
} from '@/features/presells/types.ts'
import { getDefaultFieldValue } from '@/features/presells/lib/presell-editor.ts'

type TemplateSettingsFieldsProps = {
  template: TemplateMetadata | null
  settings: Record<string, TemplateSettingValue>
  onChange: (fieldName: string, value: TemplateSettingValue) => void
}

function renderHelpText(helpText: string | null, previewSelector: string | null) {
  if (!helpText && !previewSelector) {
    return null
  }

  return (
    <p className="helper-text">
      {helpText}
      {helpText && previewSelector ? ' · ' : null}
      {previewSelector ? `Preview selector: ${previewSelector}` : null}
    </p>
  )
}

export function TemplateSettingsFields({
  template,
  settings,
  onChange,
}: TemplateSettingsFieldsProps) {
  if (!template || template.fields.length === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <strong>This template has no extra settings yet.</strong>
        <p>Core content fields are enough for the current contract.</p>
      </div>
    )
  }

  return (
    <div className="field-grid">
      {template.fields.map((field) => {
        const rawValue = settings[field.name] ?? getDefaultFieldValue(field)
        const inputId = `template-setting-${field.name}`

        if (field.type === 'textarea') {
          return (
            <label key={field.name} className="form-field" htmlFor={inputId}>
              <span>{field.label}</span>
              <textarea
                id={inputId}
                data-preview-selector={field.previewSelector ?? undefined}
                rows={4}
                value={String(rawValue)}
                onChange={(event) => {
                  onChange(field.name, event.currentTarget.value)
                }}
              />
              {renderHelpText(field.helpText, field.previewSelector)}
            </label>
          )
        }

        if (field.type === 'select') {
          return (
            <label key={field.name} className="form-field" htmlFor={inputId}>
              <span>{field.label}</span>
              <select
                id={inputId}
                data-preview-selector={field.previewSelector ?? undefined}
                value={String(rawValue)}
                onChange={(event) => {
                  onChange(field.name, event.currentTarget.value)
                }}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {renderHelpText(field.helpText, field.previewSelector)}
            </label>
          )
        }

        if (field.type === 'checkbox') {
          return (
            <div key={field.name} className="form-field form-field--checkbox">
              <label className="checkbox-field" htmlFor={inputId}>
                <input
                  id={inputId}
                  data-preview-selector={field.previewSelector ?? undefined}
                  type="checkbox"
                  checked={Boolean(rawValue)}
                  onChange={(event) => {
                    onChange(field.name, event.currentTarget.checked)
                  }}
                />
                <span>{field.label}</span>
              </label>
              {renderHelpText(field.helpText, field.previewSelector)}
            </div>
          )
        }

        if (field.type === 'range') {
          const numericValue = Number(rawValue)

          return (
            <label key={field.name} className="form-field" htmlFor={inputId}>
              <span className="form-field__split">
                <span>{field.label}</span>
                <strong>{numericValue}</strong>
              </span>
              <input
                id={inputId}
                data-preview-selector={field.previewSelector ?? undefined}
                type="range"
                min={field.min ?? undefined}
                max={field.max ?? undefined}
                step={field.step ?? undefined}
                value={Number.isFinite(numericValue) ? numericValue : Number(field.min ?? 0)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  onChange(field.name, Number(event.currentTarget.value))
                }}
              />
              {renderHelpText(field.helpText, field.previewSelector)}
            </label>
          )
        }

        return (
          <label key={field.name} className="form-field" htmlFor={inputId}>
            <span>{field.label}</span>
            <input
              id={inputId}
              data-preview-selector={field.previewSelector ?? undefined}
              type={field.type === 'color' ? 'color' : 'text'}
              value={String(rawValue)}
              onChange={(event) => {
                onChange(field.name, event.currentTarget.value)
              }}
            />
            {renderHelpText(field.helpText, field.previewSelector)}
          </label>
        )
      })}
    </div>
  )
}
