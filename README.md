# DeveloperLS Vagas

Painel pessoal que mostra as vagas de **estágio, trainee e júnior** em **Curitiba ou remotas**, coletadas automaticamente do LinkedIn pelo [Apify](https://apify.com). Cada vaga tem um botão para abrir o anúncio e outro para marcar que você já se candidatou.

## Como funciona

```
Apify (agendamento 8h, seg-sex)  →  /api/jobs (função com o token)  →  página React
```

1. Uma **Task** do Apify roda o ator `Advanced LinkedIn Job Search API` todo dia útil às 8h (horário de Brasília).
2. A função `api/jobs.js` lê o resultado da última execução bem-sucedida. O token do Apify fica só no servidor e nunca vai para o navegador.
3. A página mostra só as vagas de **hoje ou ontem**, em **Curitiba ou remotas**, sem títulos de pleno ou sênior.
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

## Configuração da busca no Apify

A busca é definida na Task do Apify, não neste código:

- **Ator:** `insights_data/advanced-linkedin-job-search-api` (ID `3GVvOeIagBWpkzSaQ`)
- **Período:** últimas 24 horas
- **Locais:** Curitiba, Paraná e Brasil (para vagas remotas)
- **Níveis:** entry level, associate e internship
- **Limite:** 12 vagas por execução e 2 por busca, para manter o custo baixo (cerca de US$ 0,04 por execução)
- **Detalhes extras desligados:** detalhes completos da vaga e dados da empresa

Para mudar as palavras-chave ou os filtros, edite o input da Task no Apify.

## Limitações

- O Apify entrega só a **data** da vaga, sem a hora. Por isso "últimas 24 horas" significa postada hoje ou ontem.
- Sem os detalhes da vaga, a modalidade vem vazia. Vagas com local só "Brazil" (sem cidade) são tratadas como remotas, o que é uma suposição.
- As vagas candidatadas ficam guardadas no navegador (`localStorage`) e não aparecem em outro aparelho.
