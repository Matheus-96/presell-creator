import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/styles/global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

if (window.location.pathname.startsWith('/p/')) {
  const presellRouter = createBrowserRouter([
    {
      path: '/p/:slug',
      lazy: async () => {
        const { PresellPage } = await import('@/features/presells/pages/PresellPage.tsx')
        return { Component: PresellPage }
      },
    },
  ])

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={presellRouter} />
      </QueryClientProvider>
    </StrictMode>,
  )
} else {
  Promise.all([
    import('@/app/App.tsx'),
    import('@/app/providers/AppProviders.tsx'),
  ]).then(([{ App }, { AppProviders }]) => {
    createRoot(rootElement).render(
      <StrictMode>
        <AppProviders>
          <App />
        </AppProviders>
      </StrictMode>,
    )
  })
}
