// What the Home screen shows: the status, one number and a line of context, and one card per
// upcoming milestone (pure functions, tested). Balances come from the forecast; no new sums.
import type { Messages } from "@/i18n/config";
import { daysBetween } from "./cycle";
import { milestoneOf, type Forecast, type ForecastExpense } from "./forecast";
import { capitalize, longMonth, shortDate, statusText, type Tone } from "./format";
import type { Milestone } from "./milestones";

export interface HomeSummary {
  tone: Tone;
  /** "Chega para tudo", "Falta dinheiro na escritura"… */
  title: string;
  /** The big number: the projected balance at the point that matters. null without balances. */
  amount: number | null;
  /** Where and when: "depois da escritura · 12 dez", "no fim de abril de 2027". */
  context: string;
  /** At most one extra line, for example "Reserva mínima" and its amount. */
  extra: { text: string; amount: number } | null;
}

interface Point {
  amount: number;
  context: string;
}

/**
 * The number follows the status. When there is enough, it is the balance after the last
 * milestone (or at the end of the forecast, without milestones). When money runs short or drops
 * below the reserve, it is the balance at the point where that happens, and the last milestone's
 * balance moves to the extra line.
 */
export function homeSummary(f: Forecast, t: Messages, year?: number): HomeSummary {
  const s = f.summary;
  const { text: title, tone } = statusText(t, s, f);
  const lastMonth = f.months.at(-1);
  if (s.status === "no-balances" || !lastMonth || lastMonth.balance == null) return { tone, title, amount: null, context: "", extra: null };

  const atEndOf = (month: string) => t.home.atEndOf(longMonth(t, month, year));
  const after = (m: NonNullable<Forecast["end"]>) => `${t.milestones[m.kind].after} · ${shortDate(t, m.date, year)}`;
  const forecastEnd: Point = { amount: lastMonth.balance, context: atEndOf(lastMonth.month) };
  // The final point: after the last milestone, or the end of the forecast without milestones.
  const final: Point = f.end?.after ? { amount: f.end.after.base, context: after(f.end) } : forecastEnd;
  // With expenses after the last milestone the forecast continues: that balance goes on the extra line.
  const continues = f.end != null && lastMonth.month > f.end.month;
  const endLine = continues ? { text: capitalize(forecastEnd.context), amount: forecastEnd.amount } : null;

  if (s.status !== "short" && s.status !== "below-reserve") return { tone, title, ...final, extra: endLine };

  // The alert point: the milestone that causes it or, if it already came from before, the end of that month.
  const limit = s.status === "short" ? 0 : f.reserve;
  const ofMonth = f.milestones.filter((m) => m.month === s.alertMonth);
  const culprit = ofMonth[0]?.before && ofMonth[0].before.base >= limit ? ofMonth.find((m) => m.after && m.after.base < limit) : undefined;
  const alertMonth = f.months.find((m) => m.month === s.alertMonth);
  const alert: Point = culprit?.after
    ? { amount: culprit.after.base, context: after(culprit) }
    : { amount: alertMonth?.balance ?? final.amount, context: atEndOf(s.alertMonth ?? lastMonth.month) };

  if (s.status === "below-reserve") return { tone, title, ...alert, extra: { text: t.common.minReserve, amount: f.reserve } };

  // Short before the final point: also show how it ends.
  const atFinalPoint = alert.context === final.context;
  const finalLine =
    !atFinalPoint && f.end?.after
      ? { text: `${capitalize(t.milestones[f.end.kind].after)} (${shortDate(t, f.end.date, year)})`, amount: final.amount }
      : !atFinalPoint
        ? { text: capitalize(final.context), amount: final.amount }
        : endLine;
  return { tone, title, ...alert, extra: finalLine };
}

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
