import type { AdminRouteDefinition } from '@/app/routes/route-definition.ts'
import { PresellsPage } from '@/features/presells/pages/PresellsPage.tsx'

export const presellsRoute = {
  id: 'presells',
  label: 'Presells',
  description: 'Browse the collection and open the CRUD editor.',
  to: '/presells',
  path: 'presells',
  element: <PresellsPage />,
} satisfies AdminRouteDefinition
