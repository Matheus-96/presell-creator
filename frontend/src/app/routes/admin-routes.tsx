import { lazy, createElement } from 'react'
import type { RouteObject } from 'react-router-dom'
import type { AdminRouteDefinition } from '@/app/routes/route-definition.ts'
import { dashboardRoute } from '@/features/dashboard/dashboard.route.tsx'
import { presellsRoute } from '@/features/presells/presells.route.tsx'
import { presellsV2Route } from '@/features/presells-v2/presells-v2.route.tsx'

export const adminRoutes = [
  dashboardRoute,
  presellsRoute,
  presellsV2Route,
] satisfies AdminRouteDefinition[]

const LazyPresellWizardPage = createElement(
  lazy(async () => {
    const module = await import('@/features/presells/wizard/PresellWizardPage.tsx')
    return { default: module.PresellWizardPage }
  }),
)

const LazyPresellEditPage = createElement(
  lazy(async () => {
    const module = await import('@/features/presells/pages/PresellEditPage.tsx')
    return { default: module.PresellEditPage }
  }),
)

const LazyPresellAnalyticsPage = createElement(
  lazy(async () => {
    const module = await import('@/features/presells/pages/PresellAnalyticsPage.tsx')
    return { default: module.PresellAnalyticsPage }
  }),
)

const LazyPresellsV2NewPage = createElement(
  lazy(async () => {
    const module = await import('@/features/presells-v2/pages/PresellsV2NewPage.tsx')
    return { default: module.PresellsV2NewPage }
  }),
)

function toRouteObject(route: AdminRouteDefinition): RouteObject {
  if (route.index) {
    return {
      index: true,
      element: route.element,
    }
  }

  return {
    path: route.path,
    element: route.element,
  }
}

export const adminRouteObjects: RouteObject[] = [
  ...adminRoutes.map(toRouteObject),
  { path: 'presells/new', element: LazyPresellWizardPage },
  { path: 'presells/new-blank', element: LazyPresellEditPage },
  { path: 'presells/:id/edit', element: LazyPresellEditPage },
  { path: 'presells/:id/analytics', element: LazyPresellAnalyticsPage },
  { path: 'presells-v2/new', element: LazyPresellsV2NewPage },
]
