import { useCallback, useEffect, useMemo, useState } from 'react'
import { apply, ensureJob, getApplications, getFeed, unapply } from './api'
import { migrateLegacyApplications } from './legacyMigration'

const APIFY_URL = 'https://console.apify.com/actors/3GVvOeIagBWpkzSaQ/input'
// A data da vaga vem sem horário, então "até 24 horas" = postada hoje ou ontem.
const RECENT_DAYS = 1

// Nada acima de júnior: pleno, sênior, especialista, líder, níveis II/III/IV etc.
const SENIOR_RE =
  /(pleno|\bpl\b|s[eê]nior|\bsr\b|especialista|\bspec\b|lead|coordenador|gerente|mid[- ]?level|staff|principal|\b(ii|iii|iv|v)\b)/i
// Só vagas de tecnologia (as fontes gerais, como o Indeed, trazem estágios de outras áreas).
const TECH_RE =
  /(desenvolv|programador|developer|\bdev\b|software|sistemas|full\s?-?stack|front|back\s?-?end|java|react|kotlin|android|mobile|\bti\b|tecnologia|\btech\b|dados|\bdata\b|engenheir|engineer|devops|\bqa\b|testes|programa[cç][aã]o)/i

// Item do /api/jobs (Apify) -> formato usado pelos cards.
const fromApify = (raw) => ({
  id: String(raw.id),
  title: raw.title ?? '',
  company: raw.company ?? '',
  location: raw.location ?? '',
  posted: raw.posted ?? '',
  workplace: raw.workplace ?? null,
  url: raw.url ?? '',
})

// Formato da API (JobResponse) -> formato usado pelos cards.
function fromApi(job) {
  return {
    id: job.id,
    title: job.title ?? '',
    company: job.company ?? '',
    location: job.location ?? '',
    posted: job.postedAt ?? '',
    workplace: job.workplace ?? null,
    url: job.url ?? '',
  }
}

const PLATFORMS = [
  [/linkedin\./i, 'LinkedIn'],
  [/indeed\./i, 'Indeed'],
  [/gupy\./i, 'Gupy'],
  [/infojobs\./i, 'InfoJobs'],
  [/catho\./i, 'Catho'],
]

function platformOf(url) {
  const hit = PLATFORMS.find(([re]) => re.test(url))
  if (hit) return hit[1]
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Web'
  }
}

const isRemote = (job) =>
  /remote|remoto/i.test(`${job.workplace ?? ''} ${job.title}`) || /^\s*(brazil|brasil)\s*$/i.test(job.location)

// Dias de calendário (local) entre a data da vaga e hoje.
function calendarDays(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return NaN
  const now = new Date()
  return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(y, m - 1, d)) / 86400000)
}

function ago(iso) {
  const days = calendarDays(iso)
  if (Number.isNaN(days)) return ''
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

function initials(name) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const HUES = [250, 200, 160, 30, 330, 100]
const hueOf = (s) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]

function JobCard({ job, applied, onToggle }) {
  return (
    <li className={`card ${applied ? 'applied' : ''}`}>
      <span className="logo-co" style={{ '--h': hueOf(job.company) }}>{initials(job.company)}</span>
      <div className="info">
        <h2>{job.title}</h2>
        <p className="line">
          <strong>{job.company}</strong>
          <span className="platform">{platformOf(job.url)}</span>
        </p>
        <p className="line muted">
          <span>📍 {isRemote(job) ? 'Remoto' : job.location}</span>
          {ago(job.posted) && <span>{ago(job.posted)}</span>}
        </p>
      </div>
      <div className="actions">
        <a className="open" href={job.url} target="_blank" rel="noopener noreferrer">Ver vaga ↗</a>
        <button className={`apply ${applied ? 'on' : ''}`} onClick={onToggle} aria-pressed={applied}>
          {applied ? '✓ Candidatei' : 'Me candidatei'}
        </button>
      </div>
    </li>
  )
}

export default function App() {
  const [jobs, setJobs] = useState([])
  // Candidaturas vêm do backend e continuam aqui mesmo depois que a vaga sai do feed de 24h.
  const [saved, setSaved] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Vagas: direto do Apify. Candidaturas: backend. Uma falha não derruba a outra.
  const load = useCallback(
    () =>
      Promise.allSettled([getFeed(), getApplications()]).then(([feedRes, appsRes]) => {
        const errors = []
        if (feedRes.status === 'fulfilled' && Array.isArray(feedRes.value)) setJobs(feedRes.value.map(fromApify))
        else errors.push(`Não consegui carregar as vagas (${feedRes.reason?.message ?? 'resposta inesperada'}).`)
        if (appsRes.status === 'fulfilled') {
          setSaved(
            appsRes.value
              .slice()
              .sort((x, y) => y.id - x.id)
              .map((a) => ({ ...fromApi(a.job), applicationId: a.id }))
          )
        } else errors.push(`Não consegui carregar as candidaturas (${appsRes.reason?.message}).`)
        setError(errors.join(' '))
      }),
    []
  )

  useEffect(() => {
    // Primeiro envia as candidaturas antigas do navegador (se houver), depois carrega as listas.
    migrateLegacyApplications().catch(() => {}).then(load)
  }, [load])

  async function toggle(job) {
    if (busy) return
    setBusy(true)
    try {
      if (job.applicationId) await unapply(job.applicationId)
      else await apply(await ensureJob(job))
      await load()
    } catch (e) {
      setError(`Não consegui salvar (${e.message}).`)
    } finally {
      setBusy(false)
    }
  }

  // Vagas do feed: recentes, em Curitiba ou remotas, sem pleno/sênior e ainda não candidatadas.
  const feed = useMemo(() => {
    const appliedUrls = new Set(saved.map((j) => j.url))
    return jobs
      .filter((j) => calendarDays(j.posted) <= RECENT_DAYS)
      .filter((j) => isRemote(j) || /curitiba/i.test(j.location))
      .filter((j) => TECH_RE.test(j.title))
      .filter((j) => !SENIOR_RE.test(j.title))
      .filter((j) => !appliedUrls.has(j.url))
      .sort((a, b) => String(b.posted).localeCompare(String(a.posted)))
  }, [jobs, saved])

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="logo">&lt;/&gt;</span>
          <div>
            <strong>DeveloperLS</strong>
            <small>Vagas</small>
          </div>
        </div>
        <nav>
          <a className="nav active" href="#vagas">Vagas</a>
          <a className="nav" href={APIFY_URL} target="_blank" rel="noopener noreferrer">Perfil de busca ↗</a>
          <a className="nav" href="https://console.apify.com/actors/runs" target="_blank" rel="noopener noreferrer">Execuções ↗</a>
        </nav>
      </aside>

      <div className="content" id="vagas">
        <section className="banner">
          <div>
            <h1>Olá, Leonardo</h1>
            <p>Novas oportunidades para a sua jornada 🚀</p>
          </div>
          <div className="where">
            <span>📍 Curitiba, PR</span>
            <small>{today}</small>
          </div>
        </section>

        <section className="stats">
          <div className="stat blue"><b>{feed.length}</b><span>Vagas encontradas</span></div>
          <div className="stat violet"><b>{saved.length}</b><span>Vagas candidatadas</span></div>
        </section>

        {error && <p className="error" role="alert">{error}</p>}

        <ul className="list">
          {feed.map((j) => (
            <JobCard key={j.id} job={j} applied={false} onToggle={() => toggle(j)} />
          ))}
        </ul>
        {!error && feed.length === 0 && <p className="empty">Nenhuma vaga nova por enquanto.</p>}

        {saved.length > 0 && (
          <>
            <h3 className="section-title">Vagas candidatadas</h3>
            <ul className="list">
              {saved.map((j) => (
                <JobCard key={j.applicationId} job={j} applied onToggle={() => toggle(j)} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
