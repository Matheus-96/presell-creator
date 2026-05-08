import {
  createLazyAdminRouteElement,
  type AdminRouteDefinition,
} from '@/app/routes/route-definition.ts'

export const templatesRoute = {
  id: 'templates',
  label: 'Templates',
  description: 'Browse backend template metadata and field contracts.',
  to: '/templates',
  path: 'templates',
  element: createLazyAdminRouteElement(async () => {
    const module = await import('@/features/templates/pages/TemplatesPage.tsx')

    return { default: module.TemplatesPage }
  }),
} satisfies AdminRouteDefinition
