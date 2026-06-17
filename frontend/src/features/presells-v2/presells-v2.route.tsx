import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const presellsV2Route = {
  id: 'presells-v2',
  label: 'Presells V2',
  description: 'V2 — presell pages baseadas em seções, geradas por IA.',
  to: '/presells-v2',
  path: 'presells-v2',
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/presells-v2/pages/PresellsV2ListPage.tsx')

    return { default: module.PresellsV2ListPage }
  }),
} satisfies AdminRouteDefinition
