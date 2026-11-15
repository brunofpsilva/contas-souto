// Client for the Wallet (BudgetBakers) REST API, checked against OpenAPI 2.0.0:
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
//   Without a date filter the API only uses the last 3 months; one lower bound is enough to override it.
//
// Limit of 500 requests per hour (X-RateLimit-* headers). During the first sync the API may
// answer 409 or send X-Sync-In-Progress: true.
// The token only exists on the server (WALLET_API_TOKEN); this module never reaches the browser.
// Error messages are technical (server log and the syncs table); the screen uses sync-messages.ts.

export const WALLET_BASE = "https://rest.budgetbakers.com/wallet";
const ACCOUNTS_PATH = "/v1/api/accounts";
const RECORDS_PATH = "/v1/api/records";
const PAGE_SIZE = 200; // maximum allowed by the API
const MAX_PAGES = 10;
const MAX_RECORD_PAGES = 40; // 8000 transactions are enough for more than a year
const TIMEOUT_MS = 15_000;

export type WalletErrorCode =
  | "no_token"
  | "invalid_token"
  | "premium"
  | "consent"
  | "forbidden"
  | "initial_sync"
  | "rate_limited"
  | "server_error"
  | "http_error"
  | "no_connection"
  | "bad_format";

export class WalletError extends Error {
  readonly code: WalletErrorCode;
  readonly status?: number;
  /** Minutes suggested before trying again, when the API says so. */
  readonly retryInMinutes?: number;

  constructor(message: string, code: WalletErrorCode, opts: { status?: number; retryInMinutes?: number } = {}) {
    super(message);
    this.name = "WalletError";
    this.code = code;
    this.status = opts.status;
    this.retryInMinutes = opts.retryInMinutes;
  }
}

/** Account as the app stores it. */
export interface WalletAccount {
  id: string;
  /** Empty when Wallet has no name (the screen shows "Unnamed account"). */
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface AccountsResult {
  accounts: WalletAccount[];
  /** Wallet said it is still syncing; the balances may change soon. */
  syncInProgress: boolean;
  requestsLeft: number | null;
}

interface Options {
  token?: string;
  base?: string;
  fetch?: typeof fetch;
}

/* ---------- API format (only the fields we use) ---------- */

interface ApiAccount {
  id?: unknown;
  name?: unknown;
  accountType?: unknown;
  archived?: unknown;
  isInvestmentAccount?: unknown;
  currencyCode?: unknown;
  balance?: { currentBalance?: unknown; currencyCode?: unknown } | null;
}

interface ApiAccountsPage {
  accounts?: unknown;
  nextOffset?: unknown;
}

/* ---------- requests ---------- */

function minutesFromRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const sec = Number(value);
  if (Number.isFinite(sec)) return Math.max(1, Math.ceil(sec / 60));
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(1, Math.ceil((date - Date.now()) / 60_000));
  return undefined;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFromResponse(res: Response, body: unknown): WalletError {
  const status = res.status;
  const code = typeof body === "object" && body && "code" in body ? String((body as { code: unknown }).code) : "";

  if (status === 401) {
    return new WalletError("Wallet rejected the token. Check WALLET_API_TOKEN (it may have expired or been deleted).", "invalid_token", { status });
  }
  if (status === 403) {
    if (code === "PREMIUM_REQUIRED") {
      return new WalletError("The Wallet API needs an active Premium plan.", "premium", { status });
    }
    if (code === "API_CONSENT_REQUIRED" || code === "API_CONSENT_AND_PREMIUM_REQUIRED") {
      return new WalletError(
        code === "API_CONSENT_REQUIRED"
          ? "API access has not been allowed in the Wallet settings."
          : "API access has not been allowed and the Premium plan is not active in Wallet.",
        "consent",
        { status },
      );
    }
    return new WalletError("The Wallet token is not allowed to read the accounts.", "forbidden", { status });
  }
  if (status === 409) {
    const min =
      typeof body === "object" && body && "retry_after_minutes" in body
        ? Number((body as { retry_after_minutes: unknown }).retry_after_minutes) || undefined
        : minutesFromRetryAfter(res.headers.get("Retry-After"));
    return new WalletError(
      `Wallet is still preparing the API data (first sync). Try again in ${min ?? "a few"} minute${min === 1 ? "" : "s"}.`,
      "initial_sync",
      { status, retryInMinutes: min },
    );
  }
  if (status === 429) {
    const min = minutesFromRetryAfter(res.headers.get("Retry-After"));
    return new WalletError(
      `Wallet request limit reached (500 per hour). Try again in ${min ?? "a few"} minute${min === 1 ? "" : "s"}.`,
      "rate_limited",
      { status, retryInMinutes: min },
    );
  }
  if (status >= 500) {
    return new WalletError(`Wallet is having problems (error ${status}). Try again later.`, "server_error", { status });
  }
  return new WalletError(`Wallet answered with error ${status}.`, "http_error", { status });
}

async function request(path: string, params: Record<string, string | number | boolean>, opts: Options): Promise<{ body: unknown; res: Response }> {
  const token = opts.token ?? process.env.WALLET_API_TOKEN;
  if (!token) throw new WalletError("WALLET_API_TOKEN is not set on the server.", "no_token");

  const url = new URL((opts.base ?? WALLET_BASE).replace(/\/$/, "") + path);
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
    throw new WalletError(timeout ? "Wallet took too long to answer." : "Couldn't connect to Wallet.", "no_connection");
  }

  const body = await readBody(res);
  if (!res.ok) throw errorFromResponse(res, body);
  return { body, res };
}

/* ---------- accounts ---------- */

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Investment accounts never count. */
export function isInvestment(a: ApiAccount): boolean {
  return a.isInvestmentAccount === true || String(a.accountType ?? "").toLowerCase() === "investment";
}

export function normalizeAccount(a: ApiAccount): WalletAccount {
  const balance = num(a.balance?.currentBalance) ?? 0;
  const currency = String(a.currencyCode || a.balance?.currencyCode || "EUR").toUpperCase();
  return {
    id: String(a.id),
    name: String(a.name ?? "").trim(),
    type: String(a.accountType ?? ""),
    balance: Math.round(balance * 100) / 100,
    currency,
  };
}

/**
 * Reads every active Wallet account, without archived and investment accounts.
 * The archived=false filter is asked of the API and repeated here to be safe.
 */
export async function fetchAccounts(opts: Options = {}): Promise<AccountsResult> {
  const raw: ApiAccount[] = [];
  let offset = 0;
  let syncInProgress = false;
  let requestsLeft: number | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { body, res } = await request(ACCOUNTS_PATH, { limit: PAGE_SIZE, offset, archived: false }, opts);
    const p = body as ApiAccountsPage;
    if (typeof body !== "object" || body === null || !Array.isArray(p.accounts)) {
      throw new WalletError("The Wallet response doesn't have the expected format (the accounts list is missing).", "bad_format");
    }
    if (res.headers.get("X-Sync-In-Progress") === "true") syncInProgress = true;
    requestsLeft = num(res.headers.get("X-RateLimit-Remaining"));

    for (const a of p.accounts as unknown[]) {
      if (typeof a === "object" && a !== null && "id" in a) raw.push(a as ApiAccount);
    }

    const next = num(p.nextOffset);
    if (next == null || p.accounts.length === 0 || next <= offset) break;
    offset = next;
  }

  const accounts = raw.filter((a) => a.archived !== true && !isInvestment(a)).map(normalizeAccount);
  return { accounts, syncInProgress, requestsLeft };
}

/* ---------- transactions ---------- */

interface ApiRecord {
  id?: unknown;
  accountId?: unknown;
  recordDate?: unknown;
  amount?: { value?: unknown; currencyCode?: unknown } | null;
  note?: unknown;
  category?: { id?: unknown; name?: unknown; parentId?: unknown; group?: { id?: unknown } | null } | null;
  transfer?: unknown;
}

/** Transaction as the app stores it (without the month, which is worked out in Lisbon time). */
export interface WalletTransaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  currency: string;
  categoryId: string | null;
  parentCategoryId: string | null;
  categoryName: string;
  categoryGroup: string;
  note: string;
  isTransfer: boolean;
}

const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** null when the essentials are missing (id, account, date or amount). */
export function normalizeTransaction(r: ApiRecord): WalletTransaction | null {
  const amount = num(r.amount?.value);
  const date = typeof r.recordDate === "string" ? new Date(r.recordDate) : null;
  if (r.id == null || r.accountId == null || amount == null || !date || Number.isNaN(date.getTime())) return null;
  const c = r.category ?? null;
  return {
    id: String(r.id),
    accountId: String(r.accountId),
    date,
    amount: Math.round(amount * 100) / 100,
    currency: String(r.amount?.currencyCode || "EUR").toUpperCase(),
    categoryId: c?.id != null ? String(c.id) : null,
    parentCategoryId: c?.parentId != null && c.parentId !== "" ? String(c.parentId) : null,
    categoryName: text(c?.name, 100),
    categoryGroup: text(c?.group?.id, 50),
    note: text(r.note),
    isTransfer: r.transfer != null,
  };
}

/** Reads every transaction dated `since` or later, from all accounts. */
export async function fetchTransactions(since: Date, opts: Options = {}): Promise<WalletTransaction[]> {
  const list: WalletTransaction[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_RECORD_PAGES; page++) {
    const { body } = await request(RECORDS_PATH, { recordDate: `gte.${since.toISOString()}`, limit: PAGE_SIZE, offset }, opts);
    const p = body as { records?: unknown; nextOffset?: unknown };
    if (typeof body !== "object" || body === null || !Array.isArray(p.records)) {
      throw new WalletError("The Wallet response doesn't have the expected format (the records list is missing).", "bad_format");
    }
    for (const r of p.records as unknown[]) {
      const t = typeof r === "object" && r !== null ? normalizeTransaction(r as ApiRecord) : null;
      if (t) list.push(t);
    }
    const next = num(p.nextOffset);
    if (next == null || p.records.length === 0 || next <= offset) return list;
    offset = next;
  }
  throw new WalletError("Too many transactions to read at once.", "bad_format");
}
