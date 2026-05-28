import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxiedPaths = ['/api', '/go', '/media', '/health', '/static']

function normalizeBasePath(value: string | undefined, fallback = '/admin-app/') {
  const normalized = value?.trim() || fallback

  if (normalized === '/') {
    return '/'
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}/`
}

// In dev, Vite only serves index.html for paths under `base`. This plugin
// intercepts /p/* requests so the presell SPA can boot at those URLs.
function presellDevFallback(indexPath: string): Plugin {
  return {
    name: 'presell-dev-fallback',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/p/')) {
          return next()
        }

        const html = await server.transformIndexHtml(
          req.url,
          fs.readFileSync(indexPath, 'utf-8'),
        )
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const rootDir = fileURLToPath(new URL('.', import.meta.url))
  const envDir = path.resolve(rootDir, '..')
  const env = loadEnv(mode, envDir, '')
  const proxyTarget = env.DEV_PROXY_TARGET || 'http://127.0.0.1:3002'
  const proxy = Object.fromEntries(
    proxiedPaths.map((p) => [
      p,
      {
        target: proxyTarget,
        changeOrigin: true,
      },
    ]),
  )

  return {
    base: normalizeBasePath(env.ADMIN_FRONTEND_PATH),
    envDir,
    plugins: [
      tailwindcss(),
      react(),
      presellDevFallback(path.resolve(rootDir, 'index.html')),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy,
    },
  }
})
