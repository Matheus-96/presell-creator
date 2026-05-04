import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const proxiedPaths = ['/api', '/admin', '/p', '/go', '/media', '/health', '/static']

function normalizeBasePath(value: string | undefined, fallback = '/admin-app/') {
  const normalized = value?.trim() || fallback

  if (normalized === '/') {
    return '/'
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}/`
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
  const env = loadEnv(mode, envDir, '')
  const proxyTarget = env.DEV_PROXY_TARGET || 'http://127.0.0.1:3001'
  const proxy = Object.fromEntries(
    proxiedPaths.map((path) => [
      path,
      {
        target: proxyTarget,
        changeOrigin: true,
      },
    ]),
  )

  return {
    base: normalizeBasePath(env.ADMIN_FRONTEND_PATH),
    envDir,
    plugins: [react()],
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
