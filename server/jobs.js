// Lógica compartilhada: usada pela função da Vercel (api/jobs.js) e pelo servidor de desenvolvimento (vite.config.js).
// O token fica só no servidor, nunca vai para o navegador.
const ACTOR_ID = '3GVvOeIagBWpkzSaQ'

export async function fetchJobs(env) {
  const token = env.APIFY_TOKEN || env.API
  if (!token) return { status: 500, body: { error: 'Token do Apify não configurado (APIFY_TOKEN).' } }

  const url =
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/last/dataset/items` +
    `?status=SUCCEEDED&clean=true&limit=500`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return { status: 502, body: { error: `Apify respondeu ${res.status}.` } }
    return { status: 200, body: await res.json() }
  } catch (e) {
    return { status: 502, body: { error: `Falha ao falar com o Apify: ${e.message}` } }
  }
}
