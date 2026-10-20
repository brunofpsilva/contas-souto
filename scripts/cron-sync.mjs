// Serviço cron do Railway: pede à app que sincronize os saldos com o Wallet.
// Variáveis: APP_URL (ex.: https://contas-souto.up.railway.app) e CRON_SECRET.
const url = process.env.APP_URL?.replace(/\/$/, "");
const segredo = process.env.CRON_SECRET;

if (!url || !segredo) {
  console.error("Faltam as variáveis APP_URL e/ou CRON_SECRET.");
  process.exit(1);
}

try {
  const res = await fetch(`${url}/api/cron/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${segredo}` },
    signal: AbortSignal.timeout(60_000),
  });
  const corpo = await res.text();
  console.log(`[cron] ${new Date().toISOString()} ${res.status} ${corpo}`);
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error("[cron] Falhou o pedido à app:", e instanceof Error ? e.message : e);
  process.exit(1);
}
