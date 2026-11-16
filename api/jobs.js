import { fetchJobs } from '../server/jobs.js'

// Função serverless da Vercel: GET /api/jobs
export default async function handler(req, res) {
  const { status, body } = await fetchJobs(process.env)
  // Só guarda em cache respostas boas; um erro não pode ficar preso no cache.
  res.setHeader('Cache-Control', status === 200 ? 's-maxage=300, stale-while-revalidate=600' : 'no-store')
  res.status(status).json(body)
}
