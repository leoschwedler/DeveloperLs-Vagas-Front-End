// Função serverless da Vercel: repassa /v1/* para o backend, acrescentando a chave da API.
// Só as rotas que o site usa são liberadas; o resto (apagar vagas, sync) não passa por aqui.
const ALLOWED = [
  ['GET', /^job\/feed$/],
  ['GET', /^job\/findAll$/],
  ['POST', /^job\/create$/],
  ['GET', /^application\/findAll$/],
  ['POST', /^application\/create$/],
  ['DELETE', /^application\/delete\/\d+$/],
]

export default async function handler(req, res) {
  const base = process.env.API_URL
  if (!base) return res.status(500).json({ error: 'API_URL não configurada.' })

  const path = [].concat(req.query.path ?? []).join('/')
  if (!ALLOWED.some(([method, re]) => method === req.method && re.test(path))) {
    return res.status(404).json({ error: 'Rota não encontrada.' })
  }

  const headers = { 'Content-Type': 'application/json' }
  if (process.env.API_KEY) headers['X-API-Key'] = process.env.API_KEY

  try {
    const upstream = await fetch(`${base.replace(/\/$/, '')}/v1/${path}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'DELETE' ? undefined : JSON.stringify(req.body ?? {}),
    })
    const text = await upstream.text()
    res.setHeader('Cache-Control', 'no-store')
    res.status(upstream.status)
    if (text) res.setHeader('Content-Type', 'application/json').send(text)
    else res.end()
  } catch {
    res.status(502).json({ error: 'Não consegui falar com a API.' })
  }
}
