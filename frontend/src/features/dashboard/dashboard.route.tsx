import type { AdminRouteDefinition } from '@/app/routes/route-definition.ts'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage.tsx'

export const dashboardRoute = {
  id: 'dashboard',
  label: 'Dashboard',
  description: 'Live admin snapshot and analytics overview.',
  to: '/',
  index: true,
  element: <DashboardPage />,
} satisfies AdminRouteDefinition
