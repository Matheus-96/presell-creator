import { lazy, createElement } from 'react'
import type { RouteObject } from 'react-router-dom'
import type { AdminRouteDefinition } from '@/app/routes/route-definition.ts'
import { dashboardRoute } from '@/features/dashboard/dashboard.route.tsx'
import { presellsRoute } from '@/features/presells/presells.route.tsx'
import { settingsRoute } from '@/features/settings/settings.route.tsx'
import { pocRoute } from '@/features/poc/poc.route.tsx'

const devOnlyRoutes: AdminRouteDefinition[] = import.meta.env.DEV ? [pocRoute] : []

export const adminRoutes = [
  dashboardRoute,
  presellsRoute,
  settingsRoute,
  ...devOnlyRoutes,
] satisfies AdminRouteDefinition[]

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
  { path: 'presells/new', element: LazyPresellEditPage },
  { path: 'presells/:id/edit', element: LazyPresellEditPage },
  { path: 'presells/:id/analytics', element: LazyPresellAnalyticsPage },
]
