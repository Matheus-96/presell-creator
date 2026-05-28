import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const presellsRoute = {
  id: 'presells',
  label: 'Presells',
  description: 'Browse, search, and filter the presell collection.',
  to: '/presells',
  path: 'presells',
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/presells/pages/PresellListPage.tsx')

    return { default: module.PresellListPage }
  }),
} satisfies AdminRouteDefinition
