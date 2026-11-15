"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { monthYear } from "@/lib/format";
import { MILESTONES, monthOfDate, parseMilestoneDate, type Milestone } from "@/lib/milestones";
import { sync } from "@/lib/sync";
import { syncErrorMessage } from "@/lib/sync-messages";
import { validateReserve, validateSpendingOverrides } from "@/lib/validation";
import { reply, type ActionState } from "./state";

/** Fetches balances and transactions from Wallet. On error, returns a simple sentence. */
export async function syncNow(_previous: ActionState): Promise<ActionState> {
  const me = await requireUser();
  const t = await getT();
  const r = await sync({ source: "manual", by: me.email });
  revalidatePath("/", "layout");
  if (!r.ok) return reply(false, syncErrorMessage(t, r.code, r.retryInMinutes));
  const transactions = r.transactionsWarning != null ? t.settings.transactionsPending : "";
  const preparing = r.walletSyncing ? t.settings.walletStillPreparing : "";
  return reply(true, `${t.settings.balancesUpdated}${transactions}${preparing}`);
}

/**
 * Saves the deed and end of construction dates and the minimum reserve (a single "Save").
 * Expenses paid at a milestone move to the month of the new date. If the date is cleared,
 * they are no longer tied to the milestone and keep the month they had.
 */
export async function saveDatesAndReserve(_previous: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser();
  const t = await getT();
  const dates: Record<Milestone, string | null> = { deed: null, construction: null };
  for (const kind of MILESTONES) {
    const r = parseMilestoneDate(form.get(kind));
    if (!r.ok) return reply(false, t.milestones[kind].invalidDate);
    dates[kind] = r.date;
  }
  const reserve = validateReserve(form.get("reserve"), t);
  if (!reserve.ok) return reply(false, reserve.error);

  const e = schema.expenses;
  const author = () => ({ updatedBy: me.email, updatedAt: new Date() });
  const values = { deedDate: dates.deed, constructionEndDate: dates.construction, reserve: reserve.amount };

  const changed = await db.transaction(async (tx) => {
    await tx
      .insert(schema.settings)
      .values({ id: 1, ...values, updatedBy: me.email })
      .onConflictDoUpdate({ target: schema.settings.id, set: { ...values, ...author() } });
    const n: Record<Milestone, number> = { deed: 0, construction: 0 };
    for (const kind of MILESTONES) {
      const date = dates[kind];
      const marked = kind === "deed" ? e.atDeed : e.atConstructionEnd;
      const untie = kind === "deed" ? { atDeed: false } : { atConstructionEnd: false };
      const updated = await tx
        .update(e)
        .set(date ? { month: monthOfDate(date), ...author() } : { ...untie, ...author() })
        .where(date ? and(eq(marked, true), ne(e.month, monthOfDate(date))) : eq(marked, true))
        .returning({ id: e.id });
      n[kind] = updated.length;
    }
    return n;
  });

  revalidatePath("/", "layout");
  const extras = MILESTONES.flatMap((kind) => {
    const n = changed[kind];
    const date = dates[kind];
    if (!n) return [];
    return date ? t.settings.movedTo(n, monthYear(t, monthOfDate(date))) : t.settings.keptMonth(n);
  });
  return reply(true, [t.common.saved, ...extras].join(" "));
}

/**
 * Saves the accounts that count for the balance. `null` goes back to the automatic selection
 * (accounts with a positive balance count).
 */
export async function saveAccounts(selection: string[] | null): Promise<ActionState> {
  const me = await requireUser();
  const t = await getT();
  const ids =
    selection === null
      ? null
      : Array.isArray(selection)
        ? selection.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 200).slice(0, 500)
        : [];

  await db
    .insert(schema.settings)
    .values({ id: 1, selectedAccounts: ids, updatedBy: me.email })
    .onConflictDoUpdate({
      target: schema.settings.id,
      set: { selectedAccounts: ids, updatedBy: me.email, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
  return reply(true, ids ? t.common.saved : t.settings.automaticSelectionSaved);
}

/** Saves the monthly spending adjusted by hand; an empty field goes back to the automatic amount. */
export async function saveSpending(_previous: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser();
  const t = await getT();
  // "Reset to automatic": every field counts as empty.
  const reset = form.get("reset") === "all";
  const entries = [...form.entries()].map(([k, v]): [string, unknown] => [k, reset ? "" : v]);
  const r = validateSpendingOverrides(entries, t);
  if (!r.ok) return reply(false, r.error);
  const o = schema.spendingOverrides;

  await db.transaction(async (tx) => {
    if (r.remove.length) await tx.delete(o).where(inArray(o.month, r.remove));
    for (const { month, amount } of r.save) {
      await tx
        .insert(o)
        .values({ month, amount, updatedBy: me.email })
        .onConflictDoUpdate({ target: o.month, set: { amount, updatedBy: me.email, updatedAt: new Date() } });
    }
  });

  revalidatePath("/", "layout");
  const n = r.save.length;
  return reply(true, reset ? t.spending.allAutomatic : n ? t.spending.savedAdjusted(n) : t.spending.savedAllAutomatic);
}
