// Cliente da API do backend. Em dev o Vite faz proxy de /v1; na Vercel a função api/proxy.js repassa
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

export const getFeed = () => request('/v1/job/feed')
export const getAllJobs = () => request('/v1/job/findAll')
export const createJob = (job) => request('/v1/job/create', { method: 'POST', body: JSON.stringify(job) })
export const getApplications = () => request('/v1/application/findAll')
export const apply = (jobId) => request('/v1/application/create', { method: 'POST', body: JSON.stringify({ jobId }) })
export const unapply = (applicationId) => request(`/v1/application/delete/${applicationId}`, { method: 'DELETE' })
