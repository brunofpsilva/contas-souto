# Contas Souto

App web para prever as despesas da casa no Souto contra o dinheiro que temos nas contas do Wallet (BudgetBakers). Usada pelo Bruno e pela Mafalda, com login Google.

> Em construção. Este README vai sendo completado a cada passo.

## Stack

Next.js 16 (App Router, TypeScript strict) · Postgres com Drizzle ORM · next-auth v4 (Google) · Tailwind 4 + shadcn/ui · Recharts · Vitest · Railway.

Node 24 (ver `engines` no `package.json`).

## Correr localmente

```bash
npm install
cp .env.example .env   # preenche os valores (ver "Variáveis de ambiente")
npm run dev
```

Abre http://localhost:3000.

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes (Vitest) |
| `npm run typecheck` | verificação de tipos |
| `npm run lint` | ESLint |
| `npm run db:generate` | gera uma migração a partir de `src/db/schema.ts` |
| `npm run db:migrate` | aplica as migrações à base de dados de `DATABASE_URL` |

## Variáveis de ambiente

Todas estão em `.env.example`. O ficheiro `.env` nunca vai para o Git.

| Variável | Para que serve | Onde a obter |
|---|---|---|
| `DATABASE_URL` | ligação ao Postgres | localmente, o teu Postgres; no Railway, a referência `${{Postgres.DATABASE_URL}}` |
| `NEXTAUTH_URL` | endereço público da app, sem barra no fim | `http://localhost:3000` em local; o domínio do Railway em produção |
| `NEXTAUTH_SECRET` | assina o cookie da sessão | gera um (ver "Gerar segredos") |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | login Google | Google Cloud Console, credenciais OAuth (passos mais abaixo, quando chegarmos lá) |
| `ALLOWED_EMAILS` | emails que podem entrar, separados por vírgula; qualquer outro é recusado | os vossos emails Google |
| `WALLET_API_TOKEN` | lê as contas do Wallet; fica só no servidor | https://web.budgetbakers.com/settings/apiTokens (precisa de Premium) |
| `CRON_SECRET` | o serviço cron usa-o para chamar `/api/cron/sync` | gera um (ver "Gerar segredos") |
| `APP_URL` | só no serviço cron: endereço da app | o domínio do Railway |

### Gerar segredos

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Corre uma vez para `NEXTAUTH_SECRET` e outra para `CRON_SECRET`.
