import { describe, expect, test } from "vitest";
import { lerContas, WalletError } from "@/lib/wallet";

// fetch falso: regista os pedidos e devolve as respostas pela ordem dada.
function fetchFalso(respostas: Array<() => Response>) {
  const pedidos: { url: URL; auth: string | null }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    pedidos.push({ url, auth: new Headers(init?.headers).get("Authorization") });
    const r = respostas.shift();
    if (!r) throw new Error("pedido inesperado: " + url);
    return r();
  }) as typeof fetch;
  return { fn, pedidos };
}

const json = (corpo: unknown, status = 200, headers: Record<string, string> = {}) => () =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json", ...headers } });

const conta = (id: string, name: string, accountType: string, saldo: number, extra: object = {}) => ({
  id,
  name,
  accountType,
  archived: false,
  isInvestmentAccount: false,
  currencyCode: "EUR",
  balance: { currentBalance: saldo, currencyCode: "EUR", rawCurrentBalance: saldo },
  ...extra,
});

const BASE = "https://wallet.teste/wallet";
const opts = (fetch: typeof globalThis.fetch) => ({ token: "token-teste", base: BASE, fetch });

describe("lerContas", () => {
  test("usa o caminho e o token certos e tira arquivadas e investimentos", async () => {
    const { fn, pedidos } = fetchFalso([
      json({
        accounts: [
          conta("a1", "ActivoBank", "CurrentAccount", 29926.39),
          conta("a2", "TR - Deposit", "SavingAccount", 10297.61),
          conta("a3", "TR - Bruno", "Investment", 3198, { isInvestmentAccount: true }),
          conta("a4", "Edenred", "Cash", 0),
          conta("a5", "Velha", "Cash", 50, { archived: true }),
          conta("a6", "Carteira de ações", "General", 900, { isInvestmentAccount: true }),
        ],
        limit: 200,
        offset: 0,
      }),
    ]);
    const r = await lerContas(opts(fn));

    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].auth).toBe("Bearer token-teste");
    expect(pedidos[0].url.pathname).toBe("/wallet/v1/api/accounts");
    expect(pedidos[0].url.searchParams.get("archived")).toBe("false");
    expect(pedidos[0].url.searchParams.get("limit")).toBe("200");
    expect(r.contas.map((c) => c.nome)).toEqual(["ActivoBank", "TR - Deposit", "Edenred"]);
    expect(r.contas[0]).toEqual({ id: "a1", nome: "ActivoBank", tipo: "CurrentAccount", saldo: 29926.39, moeda: "EUR" });
  });

  test("segue a paginação com nextOffset", async () => {
    const { fn, pedidos } = fetchFalso([
      json({ accounts: [conta("a1", "Um", "Cash", 1)], limit: 200, offset: 0, nextOffset: 200 }),
      json({ accounts: [conta("a2", "Dois", "Cash", 2)], limit: 200, offset: 200 }),
    ]);
    const r = await lerContas(opts(fn));
    expect(pedidos.map((p) => p.url.searchParams.get("offset"))).toEqual(["0", "200"]);
    expect(r.contas.map((c) => c.id)).toEqual(["a1", "a2"]);
  });

  test("conta sem saldo (balance null) fica a zero; cartão de crédito mantém saldo negativo", async () => {
    const { fn } = fetchFalso([
      json({ accounts: [conta("a1", "Nova", "Cash", 0, { balance: null }), conta("c1", "Visa", "CreditCard", -250.5)] }),
    ]);
    const r = await lerContas(opts(fn));
    expect(r.contas.map((c) => c.saldo)).toEqual([0, -250.5]);
  });

  test("indica quando o Wallet ainda está a sincronizar e os pedidos restantes", async () => {
    const { fn } = fetchFalso([
      json({ accounts: [] }, 200, { "X-Sync-In-Progress": "true", "X-RateLimit-Remaining": "487" }),
    ]);
    const r = await lerContas(opts(fn));
    expect(r.sincronizacaoEmCurso).toBe(true);
    expect(r.pedidosRestantes).toBe(487);
  });
});

describe("erros", () => {
  async function erroDe(resposta: () => Response): Promise<WalletError> {
    const { fn } = fetchFalso([resposta]);
    try {
      await lerContas(opts(fn));
    } catch (e) {
      if (e instanceof WalletError) return e;
      throw e;
    }
    throw new Error("devia ter falhado");
  }

  test("sem token não faz pedidos", async () => {
    const { fn, pedidos } = fetchFalso([]);
    const anterior = process.env.WALLET_API_TOKEN;
    delete process.env.WALLET_API_TOKEN;
    await expect(lerContas({ base: BASE, fetch: fn })).rejects.toMatchObject({ codigo: "sem_token" });
    process.env.WALLET_API_TOKEN = anterior;
    expect(pedidos).toHaveLength(0);
  });

  test("401: token inválido", async () => {
    expect((await erroDe(json({ error: "unauthorized" }, 401))).codigo).toBe("token_invalido");
  });

  test("403 com código: Premium e consentimento", async () => {
    const p = await erroDe(json({ error: "x", code: "PREMIUM_REQUIRED" }, 403));
    expect(p.codigo).toBe("premium");
    expect(p.message).toMatch(/Premium/);
    expect((await erroDe(json({ error: "x", code: "API_CONSENT_REQUIRED" }, 403))).codigo).toBe("consentimento");
  });

  test("409: primeira sincronização, com os minutos indicados", async () => {
    const e = await erroDe(json({ error: "init_sync_in_progress", retry_after_minutes: 5 }, 409));
    expect(e.codigo).toBe("sincronizacao_inicial");
    expect(e.tentarDaquiMin).toBe(5);
    expect(e.message).toContain("5 minutos");
  });

  test("429: limite de pedidos, lê o Retry-After em segundos", async () => {
    const e = await erroDe(json({ error: "rate limit" }, 429, { "Retry-After": "120" }));
    expect(e.codigo).toBe("limite_pedidos");
    expect(e.tentarDaquiMin).toBe(2);
  });

  test("500: erro do servidor", async () => {
    expect((await erroDe(json({ error: "boom" }, 500))).codigo).toBe("erro_servidor");
  });

  test("resposta sem lista de contas", async () => {
    expect((await erroDe(json({ items: [] }))).codigo).toBe("formato");
    expect((await erroDe(() => new Response("<html>", { status: 200 }))).codigo).toBe("formato");
  });

  test("falha de rede", async () => {
    const fn = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(lerContas(opts(fn))).rejects.toMatchObject({ codigo: "sem_ligacao" });
  });
});
