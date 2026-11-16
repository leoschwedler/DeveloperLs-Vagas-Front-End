// Lógica compartilhada: usada pela função da Vercel (api/jobs.js) e pelo servidor de desenvolvimento (vite.config.js).
// O token fica só no servidor, nunca vai para o navegador.

// Cada fonte é uma Task do Apify; lemos o resultado da última execução bem-sucedida de cada uma.
const SOURCES = [
  { taskId: '32HvFMJ6Tc7euFASu', map: fromLinkedIn }, // LinkedIn
  { taskId: 'VPYrrg4WeUFkRMTz9', map: fromIndeed }, // Indeed Curitiba
  { taskId: 'ODCdVLvVgwajbodR0', map: fromIndeed }, // Indeed Remoto
  { taskId: 'Ouo7eT0URULKNAXKv', map: fromGupy }, // Gupy Curitiba
  { taskId: 'CVg5F11X5lXU2AnRI', map: fromGupy }, // Gupy Remoto
]

// Lê "a.b" tanto aninhado ({a:{b}}) quanto achatado ({"a.b"}).
function pick(obj, path) {
  if (obj?.[path] !== undefined) return obj[path]
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function fromLinkedIn(j) {
  return {
    id: `li-${j.linkedin_job_id}`,
    title: j.title,
    company: j.company_name,
    location: j.location_text,
    posted: j.posted_at,
    workplace: j.workplace_type ?? null,
    url: j.url,
  }
}

function fromIndeed(j) {
  const id = pick(j, 'id')
  return {
    id: `in-${id}`,
    title: pick(j, 'title.text') ?? pick(j, 'title'),
    company: pick(j, 'company.name') ?? '',
    location: pick(j, 'location.formattedShort') ?? pick(j, 'location.formattedLong') ?? '',
    posted: pick(j, 'dates.posted'),
    workplace: pick(j, 'workArrangement.isRemote') ? 'Remote' : null,
    url: pick(j, 'urls.indeed') ?? `https://br.indeed.com/viewjob?jk=${id}`,
  }
}

function fromGupy(j) {
  const remote = j.workplaceType === 'remote' || j.isRemoteWork === true
  return {
    id: `gu-${j.id}`,
    title: j.name,
    company: String(j.careerPageName ?? j.careerPageDisplayName ?? '').replace(/\s+Jobs$/i, ''),
    location: remote ? 'Brasil' : [j.city, j.stateCode].filter(Boolean).join(', '),
    posted: String(j.publishedDate ?? j.publishedAt ?? '').slice(0, 10),
    workplace: remote ? 'Remote' : (j.workplaceType ?? null),
    url: j.jobUrl,
  }
}

async function fetchSource({ taskId, map }, token) {
  const url =
    `https://api.apify.com/v2/actor-tasks/${taskId}/runs/last/dataset/items` +
    `?status=SUCCEEDED&clean=true&limit=500`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Apify respondeu ${res.status} (task ${taskId})`)
  const items = await res.json()
  return Array.isArray(items) ? items.map(map) : []
}

export async function fetchJobs(env) {
  const token = env.APIFY_TOKEN || env.API
  if (!token) return { status: 500, body: { error: 'Token do Apify não configurado (APIFY_TOKEN).' } }

  const results = await Promise.allSettled(SOURCES.map((s) => fetchSource(s, token)))
  const ok = results.filter((r) => r.status === 'fulfilled')
  if (ok.length === 0) {
    return { status: 502, body: { error: `Falha ao falar com o Apify: ${results[0].reason?.message}` } }
  }

  // Junta tudo e tira repetidas (mesmo link).
  const seen = new Set()
  const jobs = ok
    .flatMap((r) => r.value)
    .filter((j) => j.url && j.title && !seen.has(j.url) && seen.add(j.url))
  return { status: 200, body: jobs }
}
