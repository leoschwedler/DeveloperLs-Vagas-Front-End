import { fetchJobs } from '../server/jobs.js'

// Função serverless da Vercel: GET /api/jobs
export default async function handler(req, res) {
  const { status, body } = await fetchJobs(process.env)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(status).json(body)
}
