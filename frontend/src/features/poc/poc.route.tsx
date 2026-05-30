import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const pocRoute = {
  id: 'poc',
  label: 'Gerar Presell (POC)',
  description: 'Gere um presell a partir de uma URL de produto.',
  to: '/poc',
  path: 'poc',
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/poc/PocPage.tsx')

    return { default: module.PocPage }
  }),
} satisfies AdminRouteDefinition
