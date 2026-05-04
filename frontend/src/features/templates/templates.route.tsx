import type { AdminRouteDefinition } from '@/app/routes/route-definition.ts'
import { TemplatesPage } from '@/features/templates/pages/TemplatesPage.tsx'

export const templatesRoute = {
  id: 'templates',
  label: 'Templates',
  description: 'Browse backend template metadata and field contracts.',
  to: '/templates',
  path: 'templates',
  element: <TemplatesPage />,
} satisfies AdminRouteDefinition
