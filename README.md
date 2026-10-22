# DeveloperLS Vagas

Painel pessoal que mostra as vagas de **estágio, trainee e júnior** em **Curitiba ou remotas**, coletadas automaticamente do LinkedIn, Indeed e Gupy pelo [Apify](https://apify.com). Cada vaga tem um botão para abrir o anúncio e outro para marcar que você já se candidatou.

## Como funciona

```
Apify (agendamento diário, 17h)  →  /api/jobs (função com o token)  →  página React
```

1. Cinco **Tasks** do Apify (LinkedIn, Indeed e Gupy) rodam todo dia às 17h (horário de Brasília).
2. A função `api/jobs.js` lê o resultado da última execução bem-sucedida. O token do Apify fica só no servidor e nunca vai para o navegador.
3. A página mostra só as vagas de tecnologia de **hoje ou ontem**, em **Curitiba ou remotas**, sem nada acima de júnior.
4. Ao clicar em **Me candidatei**, a vaga é salva no navegador e passa para a seção **Vagas candidatadas**. Ela continua lá mesmo depois de sair do feed de 24 horas.

Se o Apify estiver indisponível, a página usa o arquivo `public/jobs.json` como reserva.

## Tecnologias

- React 18 e Vite 5
- Função serverless (`api/jobs.js`), pronta para a Vercel
- Apify API

## Rodando localmente

Requisitos: Node.js 18 ou superior.

```bash
npm install
```

Crie um arquivo `.env` na raiz do projeto com o seu token do Apify (Apify Console → Settings → API & Integrations):

```env
APIFY_TOKEN=seu_token_aqui
```

Depois:

```bash
npm run dev
```

A página abre em `http://localhost:5173`. Em desenvolvimento, o Vite serve o endereço `/api/jobs` lendo o `.env`.

> O `.env` está no `.gitignore`. Nunca coloque o token no código nem envie esse arquivo para o GitHub.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção na pasta `dist` |
| `npm run preview` | Abre a versão de produção localmente |

## Publicando na Vercel

1. Suba o projeto para um repositório no GitHub (privado, de preferência).
2. Na Vercel, clique em **Add New → Project** e escolha o repositório. O Vite é reconhecido sozinho.
3. Em **Environment Variables**, crie `APIFY_TOKEN` com o seu token.
4. Clique em **Deploy**. A cada `git push`, a Vercel publica de novo.

A resposta de `/api/jobs` fica em cache por 5 minutos.

## Estrutura

```
api/jobs.js        função serverless da Vercel (GET /api/jobs)
server/jobs.js     busca o dataset no Apify; usada pela função e pelo Vite em desenvolvimento
public/jobs.json   vagas de reserva, usadas se o Apify falhar
src/App.jsx        a página
src/styles.css     estilos
vite.config.js     configuração do Vite e do /api/jobs em desenvolvimento
```

## Fontes de vagas (Tasks do Apify)

A busca é definida nas Tasks do Apify, não neste código. Todas rodam no mesmo agendamento (todos os dias, 17h) e a função `/api/jobs` junta os resultados de cada uma (lista `SOURCES` em `server/jobs.js`).

| Task | Ator | O que busca |
| --- | --- | --- |
| `developerls-vagas` | `insights_data/advanced-linkedin-job-search-api` | LinkedIn: Curitiba e Brasil, 24 horas, entry level e estágio, até 24 vagas por execução |
| `indeed-curitiba` | `kaix/indeed-scraper` | Indeed: desenvolvedor/programador júnior, estágio e trainee em Curitiba (35 km), 24 horas |
| `indeed-remoto` | `kaix/indeed-scraper` | Indeed: as mesmas buscas com "remoto", em todo o Brasil |
| `gupy-curitiba-v2` | `zen-studio/gupy-jobs-scraper` | Gupy: "desenvolvedor júnior" em Curitiba, até 15 vagas |
| `gupy-remoto` | `zen-studio/gupy-jobs-scraper` | Gupy: "desenvolvedor júnior" remoto, até 15 vagas |

Custo aproximado: LinkedIn US$ 3,50 por mil vagas, Indeed menos de US$ 0,10 por mil e Gupy cerca de US$ 3 por mil. Uma execução completa fica na casa de US$ 0,10 a US$ 0,20.

Para mudar palavras-chave, locais ou limites, edite o input da Task no Apify. Para incluir uma fonte nova, crie a Task, adicione-a ao agendamento e inclua uma entrada em `SOURCES` com a função que converte os campos dela.

## Filtros da página

A página (`src/App.jsx`) aplica estes filtros, nesta ordem:

1. Postada hoje ou ontem.
2. Em Curitiba ou remota.
3. Título de tecnologia (desenvolvedor, programador, software, sistemas etc.).
4. **Nada acima de júnior:** títulos com pleno, sênior, especialista, líder, staff, níveis II, III e IV são escondidos.

## Limitações

- O Apify entrega só a **data** da vaga, sem a hora. Por isso "últimas 24 horas" significa postada hoje ou ontem.
- Sem os detalhes da vaga, a modalidade vem vazia. Vagas com local só "Brazil" (sem cidade) são tratadas como remotas, o que é uma suposição.
- As vagas candidatadas ficam guardadas no navegador (`localStorage`) e não aparecem em outro aparelho.
