import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, globalThis.process?.cwd?.() || '.', '')
  const backendOrigin =
    env.VITE_BACKEND_ORIGIN || globalThis.process?.env?.VITE_BACKEND_ORIGIN || 'http://10.106.56.211:5000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
      },
    },
  }
})
