import type { AdminRouteDefinition } from '@/app/routes/route-definition.ts'
import { SettingsPage } from '@/features/settings/pages/SettingsPage.tsx'

export const settingsRoute = {
  id: 'settings',
  label: 'Settings',
  description: 'Review runtime config, auth, and API contract metadata.',
  to: '/settings',
  path: 'settings',
  element: <SettingsPage />,
} satisfies AdminRouteDefinition
