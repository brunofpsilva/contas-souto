// What the Home screen shows under the total: one card per upcoming milestone (pure function,
// tested). Balances come from the forecast; no new sums.
import { daysBetween } from "./cycle";
import { milestoneOf, type Forecast, type ForecastExpense } from "./forecast";
import type { Milestone } from "./milestones";

export interface MilestoneCard {
  kind: Milestone;
  date: string;
  /**
   * Days from today to the milestone (0 = today). Negative when the date has passed but is
   * still in the current cycle, so the forecast still counts it.
   */
  daysLeft: number;
  /** The previous milestone, when there is one: "to pay" counts from there. */
  since: Milestone | null;
  /** Unpaid expenses from today (or the previous milestone) up to and including this one. */
  toPay: number;
  toPayCount: number;
  /** Projected balance right after this milestone's payments. null without balances. */
  balanceAfter: number | null;
  /** "negative" below zero, "warning" below the reserve. */
  tone: "negative" | "warning" | "neutral";
}

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * One card per upcoming milestone, in date order. Each unpaid expense goes to the milestone it
 * is paid at or, otherwise, to the first milestone in its month or later (an overdue one counts
 * from the current month), the same order the forecast uses. Expenses after the last milestone
 * are in no card.
 */
export function milestoneCards(f: Forecast, expenses: readonly ForecastExpense[], today: string): MilestoneCard[] {
  const cards = f.milestones;
  const totals = cards.map(() => ({ amount: 0, count: 0 }));
  for (const e of expenses) {
    if (e.status === "paid") continue;
    const own = milestoneOf(e);
    const ownIndex = own ? cards.findIndex((m) => m.kind === own) : -1;
    const month = e.month < f.currentMonth ? f.currentMonth : e.month;
    const i = ownIndex >= 0 ? ownIndex : cards.findIndex((m) => m.month >= month);
    if (i < 0) continue;
    totals[i].amount += e.amount;
    totals[i].count++;
  }
  return cards.map((m, i) => {
    const balanceAfter = m.after?.base ?? null;
    const tone = balanceAfter == null ? "neutral" : balanceAfter < 0 ? "negative" : f.reserve > 0 && balanceAfter < f.reserve ? "warning" : "neutral";
    return {
      kind: m.kind,
      date: m.date,
      daysLeft: daysBetween(today, m.date),
      since: i > 0 ? cards[i - 1].kind : null,
      toPay: round(totals[i].amount),
      toPayCount: totals[i].count,
      balanceAfter,
      tone,
    };
  });
}
