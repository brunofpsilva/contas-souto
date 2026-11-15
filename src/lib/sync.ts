// Syncing the balances with Wallet. Used by the button (manual) and by the cron.
import { and, desc, eq, gt, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SyncSource } from "./domain";
import { addMonths, monthOf } from "./months";
import { fetchAccounts, fetchTransactions, WalletError, type WalletAccount } from "./wallet";

const MIN_INTERVAL_MS = 30_000; // between manual syncs
const STUCK_SYNC_MS = 2 * 60_000; // a sync "running" for longer than this is ignored
// Transactions cost about 10 requests (the limit is 500 per hour): at most once an hour.
const TRANSACTIONS_INTERVAL_MS = 55 * 60_000;
/** Full months of history (the Christmas allowance only repeats after 12). */
export const HISTORY_MONTHS = 12;

export type SyncResult =
  | { ok: true; accountCount: number; transactionCount: number | null; walletSyncing: boolean; transactionsWarning?: string }
  | {
      ok: false;
      /** Technical message, for the log and the syncs table. The screen uses syncErrorMessage(code). */
      message: string;
      code: string;
      /** Minutes until it can be tried again, when Wallet says so. */
      retryInMinutes?: number;
    };

export async function sync({ source, by }: { source: SyncSource; by?: string }): Promise<SyncResult> {
  const now = Date.now();
  const s = schema.syncs;

  const [last] = await db.select().from(s).orderBy(desc(s.startedAt)).limit(1);
  if (last && !last.finishedAt && now - last.startedAt.getTime() < STUCK_SYNC_MS) {
    return { ok: false, message: "A sync is already running.", code: "in_progress" };
  }
  if (source === "manual" && last && now - last.startedAt.getTime() < MIN_INTERVAL_MS) {
    return { ok: false, message: "The balances were updated moments ago.", code: "too_soon" };
  }

  const [entry] = await db.insert(s).values({ source, startedBy: by ?? null }).returning({ id: s.id });

  try {
    const r = await fetchAccounts();
    const when = new Date();

    // If Wallet is still preparing the data and returned no accounts, we keep the ones we have.
    const keep = r.accounts.length === 0 && r.syncInProgress;
    if (!keep) {
      await db.transaction(async (tx) => {
        const ids = r.accounts.map((a) => a.id);
        if (ids.length) await tx.delete(schema.accounts).where(notInArray(schema.accounts.id, ids));
        else await tx.delete(schema.accounts);
        if (ids.length) {
          await tx
            .insert(schema.accounts)
            .values(r.accounts.map((a) => ({ ...a, syncedAt: when })))
            .onConflictDoUpdate({
              target: schema.accounts.id,
              set: {
                name: sql`excluded.name`,
                type: sql`excluded.type`,
                balance: sql`excluded.balance`,
                currency: sql`excluded.currency`,
                syncedAt: sql`excluded.synced_at`,
              },
            });
        }
      });
    }

    // Transactions don't stop the balances from updating: if they fail, the warning stays.
    let transactionCount: number | null = null;
    let transactionsWarning: string | undefined;
    if (!keep && (await transactionsOutdated(now))) {
      try {
        transactionCount = await replaceTransactions(r.accounts, new Date());
      } catch (e) {
        transactionsWarning = e instanceof WalletError ? e.message : "Couldn't read the Wallet transactions.";
        console.error("[sync transactions]", e instanceof WalletError ? `${e.code}: ${e.message}` : e);
      }
    }

    await db
      .update(s)
      .set({
        finishedAt: new Date(),
        ok: true,
        accountCount: r.accounts.length,
        transactionCount,
        message: transactionsWarning ?? null,
        walletSyncing: r.syncInProgress,
      })
      .where(eq(s.id, entry.id));
    return { ok: true, accountCount: r.accounts.length, transactionCount, walletSyncing: r.syncInProgress, transactionsWarning };
  } catch (e) {
    const message = e instanceof WalletError ? e.message : "Couldn't connect to Wallet.";
    const code = e instanceof WalletError ? e.code : "unknown";
    // The technical detail stays in the log; the screen shows a simple sentence (sync-messages.ts).
    if (e instanceof WalletError) console.error(`[sync] ${code}${e.status ? ` (${e.status})` : ""}: ${message}`);
    else console.error("[sync]", e);
    await db.update(s).set({ finishedAt: new Date(), ok: false, message, errorCode: code }).where(eq(s.id, entry.id));
    return { ok: false, message, code, retryInMinutes: e instanceof WalletError ? e.retryInMinutes : undefined };
  }
}

async function transactionsOutdated(now: number): Promise<boolean> {
  const s = schema.syncs;
  const [last] = await db
    .select({ when: s.finishedAt })
    .from(s)
    .where(and(eq(s.ok, true), isNotNull(s.transactionCount)))
    .orderBy(desc(s.startedAt))
    .limit(1);
  return !last?.when || now - last.when.getTime() >= TRANSACTIONS_INTERVAL_MS;
}

/**
 * Replaces the stored transactions with those of the last 12 full months and the current month,
 * only from the synced accounts (no archived or investment accounts).
 */
async function replaceTransactions(accounts: readonly WalletAccount[], when: Date): Promise<number> {
  const firstMonth = addMonths(monthOf(when), -HISTORY_MONTHS);
  // One day before the start of the month in UTC, so we don't miss transactions at Lisbon midnight.
  const since = new Date(Date.parse(`${firstMonth}-01T00:00:00Z`) - 86_400_000);
  const ids = new Set(accounts.map((a) => a.id));
  const list = (await fetchTransactions(since))
    .filter((t) => ids.has(t.accountId))
    .map((t) => ({ ...t, month: monthOf(t.date), syncedAt: when }))
    .filter((t) => t.month >= firstMonth);

  await db.transaction(async (tx) => {
    await tx.delete(schema.transactions);
    for (let i = 0; i < list.length; i += 500) {
      await tx.insert(schema.transactions).values(list.slice(i, i + 500));
    }
  });
  return list.length;
}

/** Last sync that finished successfully and the last error (if it is more recent). */
export async function syncStatus() {
  const s = schema.syncs;
  const [lastOk] = await db.select().from(s).where(eq(s.ok, true)).orderBy(desc(s.startedAt)).limit(1);
  const [lastError] = await db
    .select()
    .from(s)
    .where(and(eq(s.ok, false), lastOk ? gt(s.startedAt, lastOk.startedAt) : undefined))
    .orderBy(desc(s.startedAt))
    .limit(1);
  const [running] = await db
    .select({ id: s.id })
    .from(s)
    .where(and(isNull(s.finishedAt), gt(s.startedAt, new Date(Date.now() - STUCK_SYNC_MS))))
    .limit(1);
  return { lastOk: lastOk ?? null, lastError: lastError ?? null, running: Boolean(running) };
}
