# Contas Souto

A small private web app that forecasts whether a household will have enough money to pay for buying and finishing a house.

It reads account balances and transactions from [Wallet by BudgetBakers](https://budgetbakers.com), adds the planned house expenses, and projects the balance month by month up to the key dates (the deed signing and the end of construction).

> This is a personal project built for one household. The UI is in Portuguese and some rules (salary cycles, Wallet category ids) are specific to how we use Wallet. Feel free to read or fork it, but expect to adapt it.

## Features

- **Summary**: money available today, what is still to pay, projected balance with optimistic/pessimistic band and a minimum-reserve warning.
- **Expenses**: planned and paid house expenses, each tied to a month, to the deed date or to the end of construction, and optionally to a room.
- **Budget**: rooms with a maximum budget, compared against what was paid and is still to pay (for comparison only, not part of the forecast).
- **Accounts**: Wallet balances, which accounts count, reserve, key dates and a manual sync button.
- **Day-to-day forecast**: income and spending estimated from the last 12 months of real Wallet transactions.
- Google login restricted to an email allow-list; installable as a PWA.

## Stack

Next.js 16 (App Router, TypeScript) · Postgres + Drizzle ORM · next-auth v4 (Google) · Tailwind 4 + shadcn/ui · Recharts · Vitest · Node 24.

Hosted on Vercel, with Postgres on Railway and an hourly sync triggered by GitHub Actions.

## Getting started

```bash
npm install
cp .env.example .env     # fill in the values
npm run db:migrate       # create the tables in DATABASE_URL
npm run dev              # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm test` | tests (Vitest) |
| `npm run typecheck` | type check |
| `npm run lint` | ESLint |
| `npm run db:generate` | new migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | apply migrations in `drizzle/` |
| `npm run db:studio` | browse the database |
| `npm run cron:sync` | ask the app at `APP_URL` to sync, like the cron does |

## Environment variables

See `.env.example`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (SSL is used automatically outside a private network) |
| `NEXTAUTH_URL` | public URL of the app, no trailing slash |
| `NEXTAUTH_SECRET` | signs the session cookie |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client (redirect URI: `<url>/api/auth/callback/google`) |
| `ALLOWED_EMAILS` | comma-separated emails allowed to sign in |
| `WALLET_API_TOKEN` | Wallet API token (Premium plan), server-side only |
| `SALARIOS_FIXOS` | optional fixed monthly salaries, `Name:amount,Name:amount`; empty means salaries are estimated from transactions |
| `CRON_SECRET` | shared secret for `POST /api/cron/sync` |
| `APP_URL` | app URL, used only by the cron and `npm run cron:sync` |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Deploy

1. Create a Postgres database and set `DATABASE_URL`.
2. Import the repo in Vercel and add the environment variables to Production. Production builds run the migrations before `next build` (`scripts/build.mjs`); preview builds never touch the database.
3. Add the production URL to the Google OAuth client.
4. In GitHub, add the `APP_URL` and `CRON_SECRET` repository secrets. The workflow in `.github/workflows/sincronizar-wallet.yml` calls `POST /api/cron/sync` every hour.

## Project structure

```
src/
  app/          pages (summary, expenses, budget, accounts), login, API routes
  actions/      server actions
  components/   UI (ui/ = shadcn)
  db/           Drizzle schema and connection
  lib/          forecast, key dates, salary cycles, Wallet client, validation
  proxy.ts      redirects to /login without an authorised session
drizzle/        SQL migrations
scripts/        build, migrate and cron helpers
test/           Vitest tests
```

The forecast logic lives in `src/lib/previsao.ts` and `src/lib/tendencia.ts`; the Wallet-specific rules are in `src/lib/tendencia-regras.ts`.
