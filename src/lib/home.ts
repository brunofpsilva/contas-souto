// What the Home screen shows: the status, one number and a line of context (pure function, tested).
// It only picks and describes values the forecast has already worked out; no new sums.
import type { Messages } from "@/i18n/config";
import type { Forecast } from "./forecast";
import { capitalize, longMonth, shortDate, statusText, type Tone } from "./format";
import { groupByMonth, type GroupableExpense } from "./grouping";

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

/**
 * The next unpaid expenses: overdue ones first, then by month and, within the month, the
 * largest amounts.
 */
export function upcomingPayments<T extends GroupableExpense>(expenses: readonly T[], currentMonth: string, count = 4) {
  const unpaid = expenses.filter((e) => e.status !== "paid");
  return groupByMonth(unpaid, currentMonth)
    .flatMap((g) => g.expenses)
    .slice(0, count);
}
