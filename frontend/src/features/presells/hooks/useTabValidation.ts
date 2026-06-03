import type { FieldErrors } from 'react-hook-form'
import type { PresellFormValues } from '@/features/presells/lib/presell-form-schema.ts'
import type { TabId } from '@/features/presells/components/EditorTabs.tsx'

export function useTabValidation(
  errors: FieldErrors<PresellFormValues>,
  values: PresellFormValues,
): Record<TabId, boolean> {
  return {
    content:
      !!values.headline && !errors.headline,

    visual: true,

    conversion:
      !!values.ctaText && !errors.ctaText && !errors.affiliateUrl,

    publish:
      !!values.slug && !!values.title && !errors.slug && !errors.title,
  }
}
