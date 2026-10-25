// Cliente da API REST do Wallet (BudgetBakers), confirmado na OpenAPI 2.0.0:
// https://rest.budgetbakers.com/wallet/openapi/ui
//
//   GET /v1/api/accounts?limit=&offset=&archived=false
//   -> { accounts: Account[], limit, offset, nextOffset? }
//   Account: { id, name, accountType, archived, isInvestmentAccount, currencyCode,
//              balance: { currentBalance, currencyCode, ... } | null }
//
//   GET /v1/api/records?recordDate=gte.<ISO>&limit=&offset=
//   -> { records: Record[], limit, offset, nextOffset? }
//   Record: { id, accountId, recordDate, amount: { value, currencyCode }, note,
//             category: { id, name, parentId?, group: { id, name } } | null, transfer: {...} | null }
//   Sem filtro de data, a API usa só os últimos 3 meses; com um limite basta para o substituir.
//
// Limite de 500 pedidos por hora (cabeçalhos X-RateLimit-*). Durante a primeira
// sincronização a API pode responder 409 ou indicar X-Sync-In-Progress: true.
// O token só existe no servidor (WALLET_API_TOKEN); este módulo nunca vai para o browser.

export const WALLET_BASE = "https://rest.budgetbakers.com/wallet";
const CAMINHO_CONTAS = "/v1/api/accounts";
const CAMINHO_MOVIMENTOS = "/v1/api/records";
const POR_PAGINA = 200; // máximo permitido pela API
const MAX_PAGINAS = 10;
const MAX_PAGINAS_MOVIMENTOS = 40; // 8000 movimentos chegam para mais de um ano
const TIMEOUT_MS = 15_000;

export type CodigoErroWallet =
  | "sem_token"
  | "token_invalido"
  | "premium"
  | "consentimento"
  | "proibido"
  | "sincronizacao_inicial"
  | "limite_pedidos"
  | "erro_servidor"
  | "erro_http"
  | "sem_ligacao"
  | "formato";

export class WalletError extends Error {
  readonly codigo: CodigoErroWallet;
  readonly status?: number;
  /** Minutos sugeridos até tentar de novo, quando a API os indica. */
  readonly tentarDaquiMin?: number;

  constructor(mensagem: string, codigo: CodigoErroWallet, opts: { status?: number; tentarDaquiMin?: number } = {}) {
    super(mensagem);
    this.name = "WalletError";
    this.codigo = codigo;
    this.status = opts.status;
    this.tentarDaquiMin = opts.tentarDaquiMin;
  }
}

/** Conta tal como a app a guarda. */
export interface ContaWallet {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  moeda: string;
}

export interface ResultadoContas {
  contas: ContaWallet[];
  /** O Wallet indicou que ainda está a sincronizar; os saldos podem mudar em breve. */
  sincronizacaoEmCurso: boolean;
  pedidosRestantes: number | null;
}

interface Opcoes {
  token?: string;
  base?: string;
  fetch?: typeof fetch;
}

/* ---------- formato da API (só os campos que usamos) ---------- */

interface ApiConta {
  id?: unknown;
  name?: unknown;
  accountType?: unknown;
  archived?: unknown;
  isInvestmentAccount?: unknown;
  currencyCode?: unknown;
  balance?: { currentBalance?: unknown; currencyCode?: unknown } | null;
}

interface ApiPaginaContas {
  accounts?: unknown;
  nextOffset?: unknown;
}

/* ---------- pedidos ---------- */

function minutosDeRetryAfter(valor: string | null): number | undefined {
  if (!valor) return undefined;
  const seg = Number(valor);
  if (Number.isFinite(seg)) return Math.max(1, Math.ceil(seg / 60));
  const data = Date.parse(valor);
  if (Number.isFinite(data)) return Math.max(1, Math.ceil((data - Date.now()) / 60_000));
  return undefined;
}

async function lerCorpo(res: Response): Promise<unknown> {
  const texto = await res.text();
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function erroDaResposta(res: Response, corpo: unknown): WalletError {
  const status = res.status;
  const codigo = typeof corpo === "object" && corpo && "code" in corpo ? String((corpo as { code: unknown }).code) : "";

  if (status === 401) {
    return new WalletError(
      "O Wallet recusou o token. Confirma o WALLET_API_TOKEN (pode ter expirado ou sido apagado).",
      "token_invalido",
      { status },
    );
  }
  if (status === 403) {
    if (codigo === "PREMIUM_REQUIRED") {
      return new WalletError("A API do Wallet precisa do plano Premium ativo.", "premium", { status });
    }
    if (codigo === "API_CONSENT_REQUIRED" || codigo === "API_CONSENT_AND_PREMIUM_REQUIRED") {
      return new WalletError(
        codigo === "API_CONSENT_REQUIRED"
          ? "Falta autorizar o acesso pela API nas definições do Wallet."
          : "Falta autorizar o acesso pela API e ativar o plano Premium no Wallet.",
        "consentimento",
        { status },
      );
    }
    return new WalletError("O token do Wallet não tem permissão para ler as contas.", "proibido", { status });
  }
  if (status === 409) {
    const min =
      typeof corpo === "object" && corpo && "retry_after_minutes" in corpo
        ? Number((corpo as { retry_after_minutes: unknown }).retry_after_minutes) || undefined
        : minutosDeRetryAfter(res.headers.get("Retry-After"));
    return new WalletError(
      `O Wallet ainda está a preparar os dados da API (primeira sincronização). Tenta daqui a ${min ?? "uns"} minuto${min === 1 ? "" : "s"}.`,
      "sincronizacao_inicial",
      { status, tentarDaquiMin: min },
    );
  }
  if (status === 429) {
    const min = minutosDeRetryAfter(res.headers.get("Retry-After"));
    return new WalletError(
      `Atingimos o limite de pedidos ao Wallet (500 por hora). Tenta daqui a ${min ?? "alguns"} minuto${min === 1 ? "" : "s"}.`,
      "limite_pedidos",
      { status, tentarDaquiMin: min },
    );
  }
  if (status >= 500) {
    return new WalletError(`O Wallet está com problemas (erro ${status}). Tenta mais tarde.`, "erro_servidor", { status });
  }
  return new WalletError(`O Wallet respondeu com erro ${status}.`, "erro_http", { status });
}

async function pedir(
  caminho: string,
  params: Record<string, string | number | boolean>,
  opts: Opcoes,
): Promise<{ corpo: unknown; res: Response }> {
  const token = opts.token ?? process.env.WALLET_API_TOKEN;
  if (!token) throw new WalletError("Falta configurar o WALLET_API_TOKEN no servidor.", "sem_token");

  const url = new URL((opts.base ?? WALLET_BASE).replace(/\/$/, "") + caminho);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let res: Response;
  try {
    res = await (opts.fetch ?? fetch)(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new WalletError(
      timeout ? "O Wallet demorou demasiado a responder. Tenta de novo." : "Não foi possível ligar ao Wallet.",
      "sem_ligacao",
    );
  }

  const corpo = await lerCorpo(res);
  if (!res.ok) throw erroDaResposta(res, corpo);
  return { corpo, res };
}

/* ---------- contas ---------- */

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Contas de investimento nunca contam. */
export function eInvestimento(a: ApiConta): boolean {
  return a.isInvestmentAccount === true || String(a.accountType ?? "").toLowerCase() === "investment";
}

export function normalizarConta(a: ApiConta): ContaWallet {
  const saldo = num(a.balance?.currentBalance) ?? 0;
  const moeda = String(a.currencyCode || a.balance?.currencyCode || "EUR").toUpperCase();
  return {
    id: String(a.id),
    nome: String(a.name ?? "").trim() || "Conta sem nome",
    tipo: String(a.accountType ?? ""),
    saldo: Math.round(saldo * 100) / 100,
    moeda,
  };
}

/**
 * Lê todas as contas ativas do Wallet, já sem arquivadas e sem investimentos.
 * O filtro archived=false é pedido à API e repetido aqui por segurança.
 */
export async function lerContas(opts: Opcoes = {}): Promise<ResultadoContas> {
  const brutas: ApiConta[] = [];
  let offset = 0;
  let sincronizacaoEmCurso = false;
  let pedidosRestantes: number | null = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { corpo, res } = await pedir(CAMINHO_CONTAS, { limit: POR_PAGINA, offset, archived: false }, opts);
    const p = corpo as ApiPaginaContas;
    if (typeof corpo !== "object" || corpo === null || !Array.isArray(p.accounts)) {
      throw new WalletError("A resposta do Wallet não tem o formato esperado (falta a lista de contas).", "formato");
    }
    if (res.headers.get("X-Sync-In-Progress") === "true") sincronizacaoEmCurso = true;
    pedidosRestantes = num(res.headers.get("X-RateLimit-Remaining"));

    for (const a of p.accounts as unknown[]) {
      if (typeof a === "object" && a !== null && "id" in a) brutas.push(a as ApiConta);
    }

    const proximo = num(p.nextOffset);
    if (proximo == null || p.accounts.length === 0 || proximo <= offset) break;
    offset = proximo;
  }

  const contas = brutas.filter((a) => a.archived !== true && !eInvestimento(a)).map(normalizarConta);
  return { contas, sincronizacaoEmCurso, pedidosRestantes };
}

/* ---------- movimentos ---------- */

interface ApiMovimento {
  id?: unknown;
  accountId?: unknown;
  recordDate?: unknown;
  amount?: { value?: unknown; currencyCode?: unknown } | null;
  note?: unknown;
  category?: { id?: unknown; name?: unknown; parentId?: unknown; group?: { id?: unknown } | null } | null;
  transfer?: unknown;
}

/** Movimento tal como a app o guarda (sem o mês, que é calculado na hora de Lisboa). */
export interface MovimentoWallet {
  id: string;
  contaId: string;
  data: Date;
  valor: number;
  moeda: string;
  categoriaId: string | null;
  categoriaPaiId: string | null;
  categoriaNome: string;
  grupo: string;
  nota: string;
  transferencia: boolean;
}

const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** null quando falta o essencial (id, conta, data ou valor). */
export function normalizarMovimento(r: ApiMovimento): MovimentoWallet | null {
  const valor = num(r.amount?.value);
  const data = typeof r.recordDate === "string" ? new Date(r.recordDate) : null;
  if (r.id == null || r.accountId == null || valor == null || !data || Number.isNaN(data.getTime())) return null;
  const c = r.category ?? null;
  return {
    id: String(r.id),
    contaId: String(r.accountId),
    data,
    valor: Math.round(valor * 100) / 100,
    moeda: String(r.amount?.currencyCode || "EUR").toUpperCase(),
    categoriaId: c?.id != null ? String(c.id) : null,
    categoriaPaiId: c?.parentId != null && c.parentId !== "" ? String(c.parentId) : null,
    categoriaNome: texto(c?.name, 100),
    grupo: texto(c?.group?.id, 50),
    nota: texto(r.note),
    transferencia: r.transfer != null,
  };
}

/** Lê todos os movimentos com data igual ou posterior a `desde`, de todas as contas. */
export async function lerMovimentos(desde: Date, opts: Opcoes = {}): Promise<MovimentoWallet[]> {
  const lista: MovimentoWallet[] = [];
  let offset = 0;
  for (let pagina = 0; pagina < MAX_PAGINAS_MOVIMENTOS; pagina++) {
    const { corpo } = await pedir(
      CAMINHO_MOVIMENTOS,
      { recordDate: `gte.${desde.toISOString()}`, limit: POR_PAGINA, offset },
      opts,
    );
    const p = corpo as { records?: unknown; nextOffset?: unknown };
    if (typeof corpo !== "object" || corpo === null || !Array.isArray(p.records)) {
      throw new WalletError("A resposta do Wallet não tem o formato esperado (falta a lista de movimentos).", "formato");
    }
    for (const r of p.records as unknown[]) {
      const m = typeof r === "object" && r !== null ? normalizarMovimento(r as ApiMovimento) : null;
      if (m) lista.push(m);
    }
    const proximo = num(p.nextOffset);
    if (proximo == null || p.records.length === 0 || proximo <= offset) return lista;
    offset = proximo;
  }
  throw new WalletError("Há demasiados movimentos para ler de uma vez.", "formato");
}
