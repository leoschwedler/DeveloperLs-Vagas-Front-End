import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// base './' deixa o build funcionar em qualquer hospedagem (inclusive subpasta do GitHub Pages)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: './',
    server: {
      // Em desenvolvimento, /v1 vai para o backend (API_URL e API_KEY vêm do .env, nunca do navegador).
      proxy: {
        '/v1': {
          target: env.API_URL || 'http://localhost:8080',
          changeOrigin: true,
          headers: env.API_KEY ? { 'X-API-Key': env.API_KEY } : {},
        },
      },
    },
  }
})
