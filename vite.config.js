import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchJobs } from './server/jobs.js'

// Em desenvolvimento, serve /api/jobs lendo o token do .env (a Vercel faz o mesmo em produção).
function apiDev(env) {
  return {
    name: 'api-jobs-dev',
    configureServer(server) {
      server.middlewares.use('/api/jobs', async (req, res) => {
        const { status, body } = await fetchJobs(env)
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}

// base './' deixa o build funcionar em qualquer hospedagem (inclusive subpasta do GitHub Pages)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), apiDev(env)],
    base: './',
  }
})
