import { lazy, createElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { adminRouteObjects } from '@/app/routes/admin-routes.tsx'
import { NotFoundPage } from '@/app/routes/NotFoundPage.tsx'
import { AdminShell } from '@/app/shell/AdminShell.tsx'
import { LoginPage } from '@/features/auth/pages/LoginPage.tsx'
import { RequireAuth } from '@/features/auth/RequireAuth.tsx'

const LazyPresellPage = createElement(
  lazy(async () => {
    const module = await import('@/features/presells/pages/PresellPage.tsx')
    return { default: module.PresellPage }
  }),
)

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/p/:slug',
      element: LazyPresellPage,
    },
    {
      path: '/',
      element: <RequireAuth />,
      children: [
        {
          element: <AdminShell />,
          children: [
            ...adminRouteObjects,
            {
              path: '*',
              element: <NotFoundPage />,
            },
          ],
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
