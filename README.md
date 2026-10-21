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

Next.js 16 (App Router, TypeScript strict) · Postgres com Drizzle ORM · next-auth v4 (Google) · Tailwind 4 + shadcn/ui · Recharts · Vitest. App na **Vercel**, Postgres no **Railway**, sincronização de hora a hora com **GitHub Actions**. Node 24.

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
| `DATABASE_URL` | ligação ao Postgres (fora da rede do Railway usa SSL automaticamente) | o `DATABASE_PUBLIC_URL` do Postgres no Railway (Postgres → Variables; precisa do TCP Proxy ativo) |
| `NEXTAUTH_URL` | endereço público da app, sem barra no fim | `http://localhost:3000` em local; o domínio da Vercel em produção |
| `NEXTAUTH_SECRET` | assina o cookie da sessão | gera um (ver "Gerar segredos") |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | login Google | Google Cloud Console (ver "Login Google") |
| `ALLOWED_EMAILS` | emails que podem entrar, separados por vírgula; qualquer outro é recusado | os vossos emails Google |
| `WALLET_API_TOKEN` | lê as contas do Wallet; fica só no servidor | https://web.budgetbakers.com/settings/apiTokens (precisa de Premium) |
| `CRON_SECRET` | segredo partilhado entre a app e o cron do GitHub Actions | gera um (ver "Gerar segredos") |
| `APP_URL` | só para o cron (secret no GitHub) e para `npm run cron:sync` em local: endereço da app | o domínio da Vercel |

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

## Deploy

| Peça | Onde | Custo |
|---|---|---|
| App (Next.js) | Vercel, plano Hobby | grátis (uso pessoal, não comercial) |
| Base de dados | Railway, Postgres | ver o separador **Usage** do Railway |
| Sincronização de hora a hora | GitHub Actions (`.github/workflows/sincronizar-wallet.yml`) | grátis em repositório público |

O plano gratuito da Vercel só permite cron uma vez por dia, por isso o cron é do GitHub.

### 1. Postgres no Railway

1. No projeto do Railway: **+ Create → Database → PostgreSQL**.
2. No serviço Postgres: **Settings → Networking → Public Networking → TCP Proxy** (porta `5432`). Aparece a variável `DATABASE_PUBLIC_URL`.
3. Em **Settings → Region**, vê em que região está (para escolher a mesma zona na Vercel).

### 2. App na Vercel

1. Em https://vercel.com entra com o GitHub e carrega em **Add New → Project**. Importa `contas-souto` (framework: Next.js, o resto fica como está).
2. Em **Environment Variables**, adiciona (só no ambiente **Production**):
   - `DATABASE_URL` = o `DATABASE_PUBLIC_URL` do Railway
   - `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`, `WALLET_API_TOKEN`, `CRON_SECRET`
   - `NEXTAUTH_URL` = o domínio de produção, p. ex. `https://contas-souto.vercel.app`
3. **Deploy.** No build de produção, `scripts/build.mjs` aplica as migrações antes do `next build`. Builds de pré-visualização não tocam na base de dados (e, sem as variáveis, não funcionam: é de propósito, para nunca usarem os dados reais).
4. **Settings → Functions → Function Region**: escolhe a região mais próxima da do Postgres.
5. No Google Cloud Console, acrescenta o domínio às origens e ao URI de redirecionamento (ver "Login Google").

Cada push para o branch `main` faz um deploy novo de produção.

### 3. Cron no GitHub Actions

1. No repositório no GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `APP_URL` = o domínio da Vercel (p. ex. `https://contas-souto.vercel.app`)
   - `CRON_SECRET` = o mesmo valor que puseste na Vercel
2. O workflow **Sincronizar Wallet** corre de hora a hora (minuto 7, UTC). Para testar já: separador **Actions → Sincronizar Wallet → Run workflow**.

O workflow chama `POST /api/cron/sync` com `Authorization: Bearer <CRON_SECRET>`. Se a sincronização falhar, o workflow fica a vermelho e o GitHub avisa por email. O GitHub pode atrasar alguns minutos e desliga workflows agendados em repositórios sem atividade há 60 dias; nesse caso basta reativá-lo no separador Actions. O botão **Sincronizar com Wallet** funciona sempre.

### Verificar

- Abre o domínio, entra com Google e vai a **Contas → Sincronizar com Wallet**.
- Em **Actions → Sincronizar Wallet**, cada execução deve terminar a verde com `{"ok":true,...}`; na página Contas aparece "Última sincronização: … · automática".

## Estrutura

```
src/
  app/
    (app)/            páginas com sessão: resumo, despesas, contas
    login/            página de login
    api/auth/         Auth.js (next-auth v4)
    api/cron/sync/    sincronização chamada pelo cron
    api/health/       verificação simples de que a app está de pé
    manifest.ts, icon.tsx, apple-icon.tsx   PWA
  actions/            server actions (despesas, contas)
  components/         interface (ui/ = shadcn)
  db/                 esquema Drizzle e ligação
  lib/                previsão, cliente do Wallet, validação, formatos, auth
  proxy.ts            redireciona para /login sem sessão autorizada
drizzle/              migrações SQL
scripts/              build.mjs (build + migrações em produção), migrar.mjs, cron-sync.mjs
.github/workflows/    sincronizar-wallet.yml (cron de hora a hora)
test/                 testes Vitest
```
