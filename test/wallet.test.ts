import { describe, expect, test } from "vitest";
import { fetchAccounts, fetchTransactions, WalletError } from "@/lib/wallet";

// Fake fetch: records the requests and returns the responses in the given order.
function fakeFetch(responses: Array<() => Response>) {
  const requests: { url: URL; auth: string | null }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    requests.push({ url, auth: new Headers(init?.headers).get("Authorization") });
    const r = responses.shift();
    if (!r) throw new Error("unexpected request: " + url);
    return r();
  }) as typeof fetch;
  return { fn, requests };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => () =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const account = (id: string, name: string, accountType: string, balance: number, extra: object = {}) => ({
  id,
  name,
  accountType,
  archived: false,
  isInvestmentAccount: false,
  currencyCode: "EUR",
  balance: { currentBalance: balance, currencyCode: "EUR", rawCurrentBalance: balance },
  ...extra,
});

const BASE = "https://wallet.test/wallet";
const opts = (fetch: typeof globalThis.fetch) => ({ token: "test-token", base: BASE, fetch });

describe("fetchAccounts", () => {
  test("uses the right path and token and drops archived and investment accounts", async () => {
    const { fn, requests } = fakeFetch([
      json({
        accounts: [
          account("a1", "Banco", "CurrentAccount", 25000.39),
          account("a2", "Poupança", "SavingAccount", 15000.61),
          account("a3", "Investimento", "Investment", 3198, { isInvestmentAccount: true }),
          account("a4", "Cartão refeição", "Cash", 0),
          account("a5", "Velha", "Cash", 50, { archived: true }),
          account("a6", "Carteira de ações", "General", 900, { isInvestmentAccount: true }),
        ],
        limit: 200,
        offset: 0,
      }),
    ]);
    const r = await fetchAccounts(opts(fn));

    expect(requests).toHaveLength(1);
    expect(requests[0].auth).toBe("Bearer test-token");
    expect(requests[0].url.pathname).toBe("/wallet/v1/api/accounts");
    expect(requests[0].url.searchParams.get("archived")).toBe("false");
    expect(requests[0].url.searchParams.get("limit")).toBe("200");
    expect(r.accounts.map((a) => a.name)).toEqual(["Banco", "Poupança", "Cartão refeição"]);
    expect(r.accounts[0]).toEqual({ id: "a1", name: "Banco", type: "CurrentAccount", balance: 25000.39, currency: "EUR" });
  });

  test("follows pagination with nextOffset", async () => {
    const { fn, requests } = fakeFetch([
      json({ accounts: [account("a1", "Um", "Cash", 1)], limit: 200, offset: 0, nextOffset: 200 }),
      json({ accounts: [account("a2", "Dois", "Cash", 2)], limit: 200, offset: 200 }),
    ]);
    const r = await fetchAccounts(opts(fn));
    expect(requests.map((p) => p.url.searchParams.get("offset"))).toEqual(["0", "200"]);
    expect(r.accounts.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  test("an account without a balance (balance null) is zero; a credit card keeps its negative balance", async () => {
    const { fn } = fakeFetch([json({ accounts: [account("a1", "Nova", "Cash", 0, { balance: null }), account("c1", "Visa", "CreditCard", -250.5)] })]);
    const r = await fetchAccounts(opts(fn));
    expect(r.accounts.map((a) => a.balance)).toEqual([0, -250.5]);
  });

  test("an account without a name stays empty (the screen shows a label)", async () => {
    const { fn } = fakeFetch([json({ accounts: [account("a1", "  ", "Cash", 1)] })]);
    expect((await fetchAccounts(opts(fn))).accounts[0].name).toBe("");
  });

  test("says when Wallet is still syncing and how many requests are left", async () => {
    const { fn } = fakeFetch([json({ accounts: [] }, 200, { "X-Sync-In-Progress": "true", "X-RateLimit-Remaining": "487" })]);
    const r = await fetchAccounts(opts(fn));
    expect(r.syncInProgress).toBe(true);
    expect(r.requestsLeft).toBe(487);
  });
});

describe("errors", () => {
  async function errorOf(response: () => Response): Promise<WalletError> {
    const { fn } = fakeFetch([response]);
    try {
      await fetchAccounts(opts(fn));
    } catch (e) {
      if (e instanceof WalletError) return e;
      throw e;
    }
    throw new Error("should have failed");
  }

  test("without a token it makes no requests", async () => {
    const { fn, requests } = fakeFetch([]);
    const previous = process.env.WALLET_API_TOKEN;
    delete process.env.WALLET_API_TOKEN;
    await expect(fetchAccounts({ base: BASE, fetch: fn })).rejects.toMatchObject({ code: "no_token" });
    process.env.WALLET_API_TOKEN = previous;
    expect(requests).toHaveLength(0);
  });

  test("401: invalid token", async () => {
    expect((await errorOf(json({ error: "unauthorized" }, 401))).code).toBe("invalid_token");
  });

  test("403 with a code: Premium and consent", async () => {
    const p = await errorOf(json({ error: "x", code: "PREMIUM_REQUIRED" }, 403));
    expect(p.code).toBe("premium");
    expect(p.message).toMatch(/Premium/);
    expect((await errorOf(json({ error: "x", code: "API_CONSENT_REQUIRED" }, 403))).code).toBe("consent");
  });

  test("409: first sync, with the minutes given", async () => {
    const e = await errorOf(json({ error: "init_sync_in_progress", retry_after_minutes: 5 }, 409));
    expect(e.code).toBe("initial_sync");
    expect(e.retryInMinutes).toBe(5);
    expect(e.message).toContain("5 minutes");
  });

  test("429: rate limit, reads Retry-After in seconds", async () => {
    const e = await errorOf(json({ error: "rate limit" }, 429, { "Retry-After": "120" }));
    expect(e.code).toBe("rate_limited");
    expect(e.retryInMinutes).toBe(2);
  });

  test("500: server error", async () => {
    expect((await errorOf(json({ error: "boom" }, 500))).code).toBe("server_error");
  });

  test("response without the accounts list", async () => {
    expect((await errorOf(json({ items: [] }))).code).toBe("bad_format");
    expect((await errorOf(() => new Response("<html>", { status: 200 }))).code).toBe("bad_format");
  });

  test("network failure", async () => {
    const fn = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(fetchAccounts(opts(fn))).rejects.toMatchObject({ code: "no_connection" });
  });
});

describe("fetchTransactions", () => {
  const record = (id: string, extra: object = {}) => ({
    id,
    accountId: "a1",
    recordDate: "2026-09-30T23:00:00Z",
    amount: { value: -12.5, currencyCode: "EUR" },
    note: "Almoço",
    category: { id: "c1", name: "Almoços", group: { id: "food_and_drinks", name: "Food" } },
    transfer: null,
    ...extra,
  });

  test("asks from the given date, follows pagination and normalises", async () => {
    const { fn, requests } = fakeFetch([
      json({ records: [record("r1")], limit: 200, offset: 0, nextOffset: 200 }),
      json({
        records: [
          record("r2", { transfer: { type: "paired" }, category: { id: "t", name: "Transfer", group: { id: "system_categories" } } }),
          record("r3", { category: { id: "x", name: "Mobília", parentId: "p", group: { id: "shopping" } } }),
          { id: "bad" },
        ],
        limit: 200,
        offset: 200,
      }),
    ]);
    const r = await fetchTransactions(new Date("2025-09-30T00:00:00Z"), opts(fn));
    expect(requests[0].url.pathname).toBe("/wallet/v1/api/records");
    expect(requests[0].url.searchParams.get("recordDate")).toBe("gte.2025-09-30T00:00:00.000Z");
    expect(requests.map((p) => p.url.searchParams.get("offset"))).toEqual(["0", "200"]);
    expect(r.map((t) => t.id)).toEqual(["r1", "r2", "r3"]);
    expect(r[0]).toEqual({
      id: "r1",
      accountId: "a1",
      date: new Date("2026-09-30T23:00:00Z"),
      amount: -12.5,
      currency: "EUR",
      categoryId: "c1",
      parentCategoryId: null,
      categoryName: "Almoços",
      categoryGroup: "food_and_drinks",
      note: "Almoço",
      isTransfer: false,
    });
    expect(r[1].isTransfer).toBe(true);
    expect(r[2].parentCategoryId).toBe("p");
  });
});
