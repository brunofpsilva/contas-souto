# Contas Souto

App web para prever as despesas da casa no Souto contra o dinheiro que temos nas contas do Wallet (BudgetBakers). Usada pelo Bruno e pela Mafalda, com login Google. Instala-se no telemóvel como app (PWA).

- **Resumo** (`/`): disponível hoje, por pagar, já pago e saldo no fim; estado geral; gráfico do saldo previsto com a reserva; tabela mês a mês; totais por categoria; despesas por pagar agrupadas por mês.
- **Despesas** (`/despesas`): adicionar, editar, marcar como pago ou previsto, apagar (com confirmação na própria linha). Guarda quem criou e quem marcou como paga.
- **Contas** (`/contas`): saldos do Wallet, escolha das contas que contam, reserva mínima e botão **Sincronizar com Wallet**.

## Como funciona a previsão

- **Disponível hoje** = soma dos saldos das contas escolhidas. Por defeito contam as contas com saldo positivo. As contas de investimento e as arquivadas do Wallet nunca aparecem.
- **Saldo previsto de cada mês** = disponível hoje − despesas por pagar até esse mês. As despesas pagas não entram, porque já saíram das contas. Não há poupança mensal no cálculo.
- Uma despesa por pagar com mês já passado conta no mês atual e aparece como **Atrasada**.
- O horizonte começa no mês atual (hora de Lisboa) e tem pelo menos 6 meses, estendido até à última despesa (máximo 36).
- Com reserva mínima, a app avisa no primeiro mês em que o saldo fica abaixo dela.
- Estado geral: "Falta dinheiro em <mês>", "Abaixo da reserva em <mês>", "Chega para tudo · mínimo X €" ou "Nada por pagar".

O cálculo está em `src/lib/previsao.ts` e os testes (incluindo os da versão antiga) em `test/previsao.test.ts`.

## Stack

Next.js 16 (App Router, TypeScript strict) · Postgres com Drizzle ORM · next-auth v4 (Google) · Tailwind 4 + shadcn/ui · Recharts · Vitest · Railway. Node 24.

## Correr localmente

```bash
npm install
cp .env.example .env     # preenche os valores (ver "Variáveis de ambiente")
npm run db:migrate       # cria as tabelas na base de dados de DATABASE_URL
npm run dev
```

Abre http://localhost:3000.

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes (Vitest) |
| `npm run typecheck` | verificação de tipos |
| `npm run lint` | ESLint |
| `npm run db:generate` | gera uma migração nova depois de mudar `src/db/schema.ts` |
| `npm run db:migrate` | aplica as migrações (`drizzle/`) à base de dados |
| `npm run db:studio` | abre o Drizzle Studio para ver as tabelas |
| `npm run cron:sync` | faz o mesmo que o cron: pede à app (`APP_URL`) que sincronize |

## Variáveis de ambiente

Todas estão em `.env.example`. O ficheiro `.env` nunca vai para o Git.

| Variável | Para que serve | Onde a obter |
|---|---|---|
| `DATABASE_URL` | ligação ao Postgres | em local, o `DATABASE_PUBLIC_URL` do Postgres do Railway; no serviço da app no Railway, a referência `${{Postgres.DATABASE_URL}}` |
| `NEXTAUTH_URL` | endereço público da app, sem barra no fim | `http://localhost:3000` em local; o domínio do Railway em produção |
| `NEXTAUTH_SECRET` | assina o cookie da sessão | gera um (ver "Gerar segredos") |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | login Google | Google Cloud Console (ver "Login Google") |
| `ALLOWED_EMAILS` | emails que podem entrar, separados por vírgula; qualquer outro é recusado | os vossos emails Google |
| `WALLET_API_TOKEN` | lê as contas do Wallet; fica só no servidor | https://web.budgetbakers.com/settings/apiTokens (precisa de Premium) |
| `CRON_SECRET` | segredo partilhado entre a app e o serviço cron | gera um (ver "Gerar segredos") |
| `APP_URL` | só no serviço cron: endereço da app | o domínio do Railway |

### Gerar segredos

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Corre uma vez para `NEXTAUTH_SECRET` e outra para `CRON_SECRET`.

## Login Google

1. Abre https://console.cloud.google.com e cria um projeto (por exemplo "Contas Souto"): menu do projeto no topo → **Novo projeto**.
2. **APIs e serviços → Ecrã de consentimento OAuth** (ou "Google Auth Platform → Branding"):
   - Nome da app: `Contas Souto`; email de suporte: o teu.
   - Público: **Externo**. Deixa a app em modo **Teste** e, em **Utilizadores de teste**, adiciona o teu email e o da Mafalda.
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicação Web**.
   - **Origens JavaScript autorizadas**: `http://localhost:3000` e, depois do deploy, `https://<o-teu-domínio>`.
   - **URIs de redirecionamento autorizados**: `http://localhost:3000/api/auth/callback/google` e `https://<o-teu-domínio>/api/auth/callback/google`.
4. Copia o **ID do cliente** para `GOOGLE_CLIENT_ID` e o **Segredo do cliente** para `GOOGLE_CLIENT_SECRET`.

Mesmo que alguém consiga passar pelo ecrã do Google, a app só deixa entrar os emails de `ALLOWED_EMAILS` (verificado no login e em cada pedido).

## Token do Wallet

Em https://web.budgetbakers.com/settings/apiTokens gera um token (precisa do plano Premium) e põe-no em `WALLET_API_TOKEN`. Na primeira vez, o Wallet demora uns minutos a preparar os dados; a página Contas mostra essa mensagem até ficar pronto. O limite é de 500 pedidos por hora; a app faz 1 por sincronização.

A app usa `GET https://rest.budgetbakers.com/wallet/v1/api/accounts` (confirmado na documentação OpenAPI: https://rest.budgetbakers.com/wallet/openapi/ui).

## Deploy no Railway

O projeto tem três serviços: **Postgres**, **app** e **cron**. A configuração da app está em `railway.json` e a do cron em `railway.cron.json`.

### 1. Postgres

No projeto do Railway: **+ Create → Database → PostgreSQL**. Não precisa de mais nada.

### 2. App

1. **+ Create → GitHub Repo** e escolhe `contas-souto`. O Railway lê o `railway.json`: faz `npm run build`, aplica as migrações antes de cada deploy (`npm run db:migrate`) e arranca com `npm start`. O health check é `/api/health`.
2. No serviço, separador **Variables**, adiciona:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (escreve exatamente isto; o Railway liga ao Postgres pela rede interna)
   - `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`, `WALLET_API_TOKEN`, `CRON_SECRET`
   - `NEXTAUTH_URL` = o domínio do passo 3 (por exemplo `https://contas-souto.up.railway.app`)
3. **Settings → Networking → Generate Domain** para teres o endereço público (ou **Custom Domain** se quiseres um domínio teu, seguindo as instruções de DNS que o Railway mostra).
4. Volta ao Google Cloud Console e acrescenta esse domínio às origens e ao URI de redirecionamento (ver "Login Google").

Cada push para o branch `main` faz um deploy novo.

### 3. Cron (sincronização de hora a hora)

1. **+ Create → GitHub Repo** e escolhe outra vez `contas-souto`. Muda o nome do serviço para `cron`.
2. **Settings → Config-as-code → Railway Config File**: `/railway.cron.json`. Isto faz o serviço correr `node scripts/cron-sync.mjs` de hora a hora, à hora certa (`0 * * * *`) e terminar.
3. **Variables**:
   - `APP_URL` = `https://${{app.RAILWAY_PUBLIC_DOMAIN}}` (troca `app` pelo nome do serviço da app)
   - `CRON_SECRET` = `${{app.CRON_SECRET}}`
4. Não gere domínio para este serviço.

O cron chama `POST /api/cron/sync` com `Authorization: Bearer <CRON_SECRET>`. Cada sincronização fica registada e a página Contas mostra a última ("automática").

### Verificar

- Abre o domínio, entra com Google e vai a **Contas → Sincronizar com Wallet**.
- Nos **Deploy Logs** do serviço cron, deve aparecer `[cron] ... 200 {"ok":true,...}` a cada hora.

## Estrutura

```
src/
  app/
    (app)/            páginas com sessão: resumo, despesas, contas
    login/            página de login
    api/auth/         Auth.js (next-auth v4)
    api/cron/sync/    sincronização chamada pelo cron
    api/health/       health check do Railway
    manifest.ts, icon.tsx, apple-icon.tsx   PWA
  actions/            server actions (despesas, contas)
  components/         interface (ui/ = shadcn)
  db/                 esquema Drizzle e ligação
  lib/                previsão, cliente do Wallet, validação, formatos, auth
  proxy.ts            redireciona para /login sem sessão autorizada
drizzle/              migrações SQL
scripts/              migrar.mjs (migrações), cron-sync.mjs (cron)
test/                 testes Vitest
```
