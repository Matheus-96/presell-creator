import type { ReactElement } from 'react'

type BaseAdminRouteDefinition = {
  id: string
  label: string
  description: string
  to: string
  element: ReactElement
}

type AdminIndexRouteDefinition = BaseAdminRouteDefinition & {
  index: true
  path?: never
}

type AdminPathRouteDefinition = BaseAdminRouteDefinition & {
  index?: false
  path: string
}

export type AdminRouteDefinition =
  | AdminIndexRouteDefinition
  | AdminPathRouteDefinition
