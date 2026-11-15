// Does the same as the GitHub Actions cron: asks the app to sync the balances with Wallet.
// Variables: APP_URL (e.g. https://contas-souto.vercel.app or http://localhost:3000) and CRON_SECRET.
const url = process.env.APP_URL?.replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

if (!url || !secret) {
  console.error("APP_URL and/or CRON_SECRET are not set.");
  process.exit(1);
}

try {
  const res = await fetch(`${url}/api/cron/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.text();
  console.log(`[cron] ${new Date().toISOString()} ${res.status} ${body}`);
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error("[cron] The request to the app failed:", e instanceof Error ? e.message : e);
  process.exit(1);
}
