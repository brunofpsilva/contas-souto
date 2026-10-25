# Contas Souto

App web para prever as despesas da casa no Souto contra o dinheiro que temos nas contas do Wallet (BudgetBakers). Usada pelo Rui e pela Ana, com login Google. Instala-se no telemóvel como app (PWA).

- **Resumo** (`/`): disponível hoje, por pagar, já pago e saldo no fim; estado geral; "Como chegamos à escritura" (hoje, entradas, dia a dia, despesas da casa, antes, na escritura e depois); gráfico do saldo até à escritura com a banda pessimista–otimista e a reserva; tabela mês a mês; previsão do dia a dia ("de onde vem cada número"); totais por categoria; gasto por divisão face ao orçamento; despesas por pagar agrupadas por mês.
- **Despesas** (`/despesas`): adicionar, editar, marcar como pago ou previsto, apagar (com confirmação na própria linha). Cada despesa tem um mês ou fica **na escritura** ou **na conclusão da obra**, e tem uma divisão da casa (ou "Não aplicável"). Dá para filtrar por divisão. Guarda quem criou e quem marcou como paga.
- **Orçamento** (`/orcamento`): divisões da casa (criar, renomear, apagar) e o orçamento máximo de cada uma. O orçamento geral é a soma das divisões; o gasto conta o que está pago e o que está por pagar. Ao apagar uma divisão, as despesas dela passam a "Não aplicável". O orçamento é só para comparar: não entra na previsão do saldo.
- **Contas** (`/contas`): saldos do Wallet, escolha das contas que contam, reserva mínima, datas da escritura e da conclusão da obra e botão **Sincronizar com Wallet**.

## Como funciona a previsão

- **Disponível hoje** = soma dos saldos das contas escolhidas. Por defeito contam as contas com saldo positivo. As contas de investimento e as arquivadas do Wallet nunca aparecem.
- **Saldo previsto de cada mês** = disponível hoje − despesas por pagar até esse mês + o que se espera do dia a dia (salários menos gastos). As despesas pagas não entram, porque já saíram das contas.
- Uma despesa por pagar com mês já passado conta no mês atual e aparece como **Atrasada**.
- Com data da escritura ou da conclusão da obra, o horizonte vai do mês atual (hora de Lisboa) até ao mês da que for mais tarde. Sem datas, ou se já passaram, tem pelo menos 6 meses, estendido até à última despesa (máximo 36).
- Com reserva mínima, a app avisa no primeiro mês em que o saldo fica abaixo dela.
- Estado geral: "Falta dinheiro em <mês>", "Abaixo da reserva em <mês>", "Chega para tudo · mínimo X €" ou "Nada por pagar".

O cálculo está em `src/lib/previsao.ts` e os testes (incluindo os da versão antiga) em `test/previsao.test.ts`.

### Escritura e conclusão da obra

- Há duas datas, editáveis em **Contas**: a da escritura e a da conclusão da obra (o dia em que se paga o fim da obra ao empreiteiro). Uma não depende da outra e a obra pode ser antes ou depois da escritura.
- As despesas marcadas "na escritura" ou "na conclusão da obra" ficam no ciclo dessa data e mudam de mês quando a data muda. Se a data for apagada, deixam de estar ligadas a ela e ficam com o mês que tinham. Uma despesa não pode estar nas duas.
- A previsão acaba no mês da data mais tarde. No mês de cada data, o dia a dia e as despesas com mês próprio contam **antes** e as dessa data **depois**; se as duas caírem no mesmo mês, seguem a ordem dos dias. O extrato tem uma linha para cada uma.
- Despesas com mês depois da última data ainda não entram no saldo; o Resumo indica quantas são e quanto somam.

### Previsão do dia a dia

Vem dos movimentos reais do Wallet, que a app guarda na tabela `movimentos` (últimos 12 meses completos e o mês atual). Não depende do Claude: a sincronização de hora a hora (cron e botão) lê `GET /v1/api/records` com o mesmo token, no máximo uma vez por hora (cerca de 10 pedidos).

- Cada "mês" é um ciclo de salário: começa no dia 26 (ou no dia útil anterior; em dezembro no dia 23) e acaba na véspera do seguinte. Os movimentos dos últimos dias são datados no Wallet no dia 1 do mês seguinte, com a data verdadeira na nota (ver `src/lib/ciclo.ts`).
- Janela: os últimos 12 ciclos completos, sem transferências e sem a categoria **Casa** do Wallet (despesas pontuais da casa). Entram todas as contas sincronizadas.
- **Salários**: com `SALARIOS_FIXOS` definido, valem sempre a soma dos valores fixos (igual nos três cenários). Sem a variável, vêm da categoria Salários: base = 2.º mês mais baixo (um mês normal); otimista = mediana; pessimista = o mês mais baixo. Os valores ficam fora do código porque o repositório é público.
- **Outros rendimentos** (subsídio de alimentação, juros…): base = mediana; intervalo entre o 2.º mais baixo e o 2.º mais alto.
- **Gastos do dia a dia** e **renda**: base = mediana; otimista = 2.º mês mais barato; pessimista = 2.º mais caro.
- **Uma vez por ano** (subsídios de Natal e de férias, bónus, reembolso do IRS, reconhecidos pela nota): entram no mesmo mês do ano passado, com o mesmo valor. No pessimista, o bónus e o IRS ficam a zero.
- No mês atual só conta o que ainda falta entrar ou sair.
- Na tabela da previsão dá para escrever à mão os gastos de um ciclo (tabela `gastos_editados`): esse valor substitui os gastos do dia a dia e a renda desse ciclo. Vazio volta ao automático.
- A app assinala os **picos** do ano passado (uma categoria que passou de 100 € e de duas vezes o habitual + 50 €) como possíveis gastos no mesmo ciclo deste ano.

As categorias e notas usadas estão em `src/lib/tendencia-regras.ts` (ids do Wallet); o cálculo em `src/lib/tendencia.ts`.

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
| `SALARIOS_FIXOS` | salários mensais fixos da previsão, `Nome:valor` separados por vírgula com ponto decimal (ex.: `Ana:1500.50,Rui:1200`); vazio usa os movimentos | os vossos salários líquidos |
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
   - Público: **Externo**. Deixa a app em modo **Teste** e, em **Utilizadores de teste**, adiciona o teu email e o da Ana.
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicação Web**.
   - **Origens JavaScript autorizadas**: `http://localhost:3000` e, depois do deploy, `https://<o-teu-domínio>`.
   - **URIs de redirecionamento autorizados**: `http://localhost:3000/api/auth/callback/google` e `https://<o-teu-domínio>/api/auth/callback/google`.
4. Copia o **ID do cliente** para `GOOGLE_CLIENT_ID` e o **Segredo do cliente** para `GOOGLE_CLIENT_SECRET`.

Mesmo que alguém consiga passar pelo ecrã do Google, a app só deixa entrar os emails de `ALLOWED_EMAILS` (verificado no login e em cada pedido).

## Token do Wallet

Em https://web.budgetbakers.com/settings/apiTokens gera um token (precisa do plano Premium) e põe-no em `WALLET_API_TOKEN`. Na primeira vez, o Wallet demora uns minutos a preparar os dados; a página Contas mostra essa mensagem até ficar pronto. O limite é de 500 pedidos por hora; a app faz 1 por sincronização e, no máximo uma vez por hora, mais uns 10 para os movimentos.

A app usa `GET https://rest.budgetbakers.com/wallet/v1/api/accounts` e `GET .../v1/api/records` (confirmados na documentação OpenAPI: https://rest.budgetbakers.com/wallet/openapi/ui).

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
   - `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`, `WALLET_API_TOKEN`, `CRON_SECRET`, `SALARIOS_FIXOS`
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
    (app)/            páginas com sessão: resumo, despesas, orçamento, contas
    login/            página de login
    api/auth/         Auth.js (next-auth v4)
    api/cron/sync/    sincronização chamada pelo cron
    api/health/       verificação simples de que a app está de pé
    manifest.ts, icon.tsx, apple-icon.tsx   PWA
  actions/            server actions (despesas, contas, orçamento)
  components/         interface (ui/ = shadcn)
  db/                 esquema Drizzle e ligação
  lib/                previsão, escritura e conclusão da obra, ciclos, tendência do dia a dia, orçamento, cliente do Wallet, validação, formatos, auth
  proxy.ts            redireciona para /login sem sessão autorizada
drizzle/              migrações SQL
scripts/              build.mjs (build + migrações em produção), migrar.mjs, cron-sync.mjs
.github/workflows/    sincronizar-wallet.yml (cron de hora a hora)
test/                 testes Vitest
```
