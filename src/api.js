// Cliente das APIs. O feed vem direto do Apify (/api/jobs); as candidaturas ficam no backend. Em dev o Vite faz proxy de /v1; na Vercel a função api/proxy.js repassa
// as chamadas, assim a chave da API fica só no servidor.
async function request(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`)
    error.status = res.status
    throw error
  }
  return res.status === 204 ? null : res.json()
}

export const getFeed = () => request('/api/jobs')
export const getAllJobs = () => request('/v1/job/findAll')
export const createJob = (job) => request('/v1/job/create', { method: 'POST', body: JSON.stringify(job) })
export const getApplications = () => request('/v1/application/findAll')
export const apply = (jobId) => request('/v1/application/create', { method: 'POST', body: JSON.stringify({ jobId }) })
export const unapply = (applicationId) => request(`/v1/application/delete/${applicationId}`, { method: 'DELETE' })

// A vaga do feed (Apify) só vai para o banco quando vira candidatura. Id do feed: "li-123", "in-abc", "gu-45".
const SOURCES = { li: 'LINKEDIN', in: 'INDEED', gu: 'GUPY' }
const cut = (value, max) => (value ? String(value).slice(0, max) : value)

export async function ensureJob(job) {
  const source = SOURCES[String(job.id).slice(0, 2)]
  const externalId = String(job.id).slice(3)
  if (!source || !externalId) throw new Error('vaga sem origem conhecida')
  const find = async () =>
    (await getAllJobs()).find((j) => j.jobSource === source && j.externalId === externalId)

  const existing = await find()
  if (existing) return existing.id
  try {
    const created = await createJob({
      jobSource: source,
      externalId: cut(externalId, 100),
      title: cut(job.title, 255),
      company: cut(job.company, 255) || 'N/D',
      location: cut(job.location, 255),
      workplace: cut(job.workplace, 20),
      url: job.url,
      postedAt: /^\d{4}-\d{2}-\d{2}/.test(String(job.posted)) ? String(job.posted).slice(0, 10) : null,
    })
    return created.id
  } catch (e) {
    if (e.status === 409) return (await find()).id // já existia (criada em paralelo)
    throw e
  }
}
