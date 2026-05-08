import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const dashboardRoute = {
  id: 'dashboard',
  label: 'Dashboard',
  description: 'Live admin snapshot and analytics overview.',
  to: '/',
  index: true,
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/dashboard/pages/DashboardPage.tsx')

    return { default: module.DashboardPage }
  }),
} satisfies AdminRouteDefinition
