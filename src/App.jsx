import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'vagas-candidaturas-v2'
const APIFY_URL = 'https://console.apify.com/actors/3GVvOeIagBWpkzSaQ/input'
// A data da vaga vem sem horário, então "até 24 horas" = postada hoje ou ontem.
const RECENT_DAYS = 1

const SENIOR_RE = /(pleno|\bpl\b|s[eê]nior|\bsr\b|especialista|\bspec\b|lead|coordenador)/i

// Aceita tanto o formato salvo em jobs.json quanto o dataset bruto exportado do Apify.
function normalize(raw) {
  return {
    id: String(raw.id ?? raw.linkedin_job_id ?? raw.url),
    title: raw.title ?? '',
    company: raw.company ?? raw.company_name ?? '',
    location: raw.location ?? raw.location_text ?? '',
    posted: raw.posted ?? raw.posted_at ?? '',
    workplace: raw.workplace ?? raw.workplace_type ?? null,
    url: raw.url ?? raw.job_url ?? '',
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

function loadApplied() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
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
  const [error, setError] = useState('')
  // Candidaturas guardam a vaga inteira, para continuarem aqui mesmo depois que saírem do feed de 24h.
  const [applied, setApplied] = useState(loadApplied)

  useEffect(() => {
    const get = (url) =>
      fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))

    // Tenta o Apify ao vivo (função /api/jobs); se falhar, usa o jobs.json salvo.
    get('/api/jobs')
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('resposta inesperada')
        setJobs(data.map(normalize))
      })
      .catch(() =>
        get(`${import.meta.env.BASE_URL}jobs.json`)
          .then((data) => setJobs(data.map(normalize)))
          .catch((e) => setError(`Não consegui carregar as vagas (${e.message}).`))
      )
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applied))
    } catch {
      /* armazenamento indisponível: segue sem persistir */
    }
  }, [applied])

  function toggle(job) {
    setApplied((prev) => {
      const next = { ...prev }
      if (next[job.id]) delete next[job.id]
      else next[job.id] = { ...job, appliedAt: new Date().toISOString() }
      return next
    })
  }

  // Vagas do feed: recentes, em Curitiba ou remotas, sem pleno/sênior e ainda não candidatadas.
  const feed = useMemo(
    () =>
      jobs
        .filter((j) => calendarDays(j.posted) <= RECENT_DAYS)
        .filter((j) => isRemote(j) || /curitiba/i.test(j.location))
        .filter((j) => !SENIOR_RE.test(j.title))
        .filter((j) => !applied[j.id])
        .sort((a, b) => String(b.posted).localeCompare(String(a.posted))),
    [jobs, applied]
  )

  const saved = useMemo(
    () => Object.values(applied).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
    [applied]
  )

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
                <JobCard key={j.id} job={j} applied onToggle={() => toggle(j)} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
