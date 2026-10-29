import { apply, createJob, getAllJobs } from './api'

// Candidaturas antigas ficavam no localStorage. Esta função envia tudo para a API uma única vez.
const STORAGE_KEY = 'vagas-candidaturas-v2'
const SOURCES = { li: 'LINKEDIN', in: 'INDEED', gu: 'GUPY' }

function loadLegacy() {
  try {
    return Object.values(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {})
  } catch {
    return []
  }
}

const validDate = (value) => (/^\d{4}-\d{2}-\d{2}/.test(String(value)) ? String(value).slice(0, 10) : null)

// Devolve true se algo foi migrado (para a tela recarregar as listas).
export async function migrateLegacyApplications() {
  const entries = loadLegacy()
  if (entries.length === 0) return false

  const known = new Map((await getAllJobs()).map((j) => [`${j.jobSource}:${j.externalId}`, j.id]))
  let allDone = true

  for (const entry of entries) {
    const source = SOURCES[String(entry.id).slice(0, 2)]
    const externalId = String(entry.id).slice(3)
    if (!source || !externalId) continue
    try {
      let jobId = known.get(`${source}:${externalId}`)
      if (!jobId) {
        const created = await createJob({
          jobSource: source,
          externalId,
          title: entry.title,
          company: entry.company || 'N/D',
          location: entry.location,
          workplace: entry.workplace,
          url: entry.url,
          postedAt: validDate(entry.posted),
        })
        jobId = created.id
      }
      await apply(jobId)
    } catch (e) {
      if (e.status !== 409) allDone = false // 409 = já estava candidatada
    }
  }

  if (allDone) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* sem acesso ao armazenamento */
    }
  }
  return true
}
