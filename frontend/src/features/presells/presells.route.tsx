import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const presellsRoute = {
  id: 'presells',
  label: 'Presells',
  description: 'Browse the collection and open the CRUD editor.',
  to: '/presells',
  path: 'presells',
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/presells/pages/PresellsPage.tsx')

    return { default: module.PresellsPage }
  }),
} satisfies AdminRouteDefinition
