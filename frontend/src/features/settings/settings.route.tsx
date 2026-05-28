import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const settingsRoute = {
  id: 'settings',
  label: 'Settings',
  description: 'Review runtime config, auth, and API contract metadata.',
  to: '/settings',
  path: 'settings',
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/settings/pages/SettingsPage.tsx')

    return { default: module.SettingsPage }
  }),
} satisfies AdminRouteDefinition
