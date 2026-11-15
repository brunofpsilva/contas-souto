// What the Forecast screen shows, from what the forecast and the trend have already worked out
// (pure functions, tested). Here we only pick, add up and describe existing values: the rules
// and the calculations are in forecast.ts and trend.ts.
import type { Messages } from "@/i18n/config";
import type { Forecast } from "./forecast";
import { capitalize, longMonth, shortDate } from "./format";
import { peaksForCycle, type AnnualIncome, type CurrentCycle, type CycleSpending, type Trend } from "./trend";

const round = (v: number) => Math.round(v * 100) / 100;

export interface ForecastSums {
  balanceToday: number;
  income: number;
  spending: number;
  expenses: number;
  /** Where the sums end: "Depois da escritura · 12 dez" or "No fim de abril de 2027". */
  label: string;
  /** balanceToday + income − spending − expenses */
  balance: number;
}

/**
 * The sums from today to the last milestone (or to the end of the forecast, without milestones):
 * what comes in, what goes out and the balance that is left. It is the real sum the old "Total"
 * row was not.
 */
export function forecastSums(f: Forecast, t: Messages, year?: number): ForecastSums | null {
  const balanceToday = f.summary.available;
  const last = f.months.at(-1);
  if (balanceToday == null || !last || last.balance == null) return null;
  const end = f.end?.after ? f.end : null;
  const months = f.months.filter((m) => m.month <= (end?.month ?? last.month));
  const sum = (value: (m: (typeof months)[number]) => number) => round(months.reduce((s, m) => s + value(m), 0));
  return {
    balanceToday,
    income: sum((m) => m.expectedIncome),
    spending: sum((m) => m.expectedSpending),
    expenses: sum((m) => m.expenses),
    label: end
      ? `${capitalize(t.milestones[end.kind].after)} · ${shortDate(t, end.date, year)}`
      : t.forecast.atEndOf(longMonth(t, last.month, year)),
    balance: end?.after ? end.after.base : last.balance,
  };
}

export interface ForecastRow {
  key: string;
  /** "Dezembro", "Janeiro de 2027" or, for a milestone, "Escritura · 12 dez". */
  title: string;
  /** Only in the current month: "até 25 nov". */
  until?: string;
  /** The row is a milestone (the deed's or the end of construction's payments). */
  milestone: boolean;
  income: number;
  spending: number;
  expenses: number;
  /** Projected balance at the end of the row. */
  balance: number | null;
  /** The balance drops below zero or below the minimum reserve. */
  alert: "short" | "reserve" | null;
  notes: { text: string; amount?: number; private?: boolean }[];
}

/**
 * One row per month and, in months with milestones, one row per milestone after it. The month's
 * row shows the balance before the milestones; each milestone shows the balance after its payments.
 */
export function forecastRows(
  f: Forecast,
  t: Messages,
  {
    annual = [],
    cycle,
    spendingByCycle = [],
    year,
  }: { annual?: readonly AnnualIncome[]; cycle?: CurrentCycle; spendingByCycle?: readonly CycleSpending[]; year?: number } = {},
): ForecastRow[] {
  const alert = (balance: number | null): ForecastRow["alert"] =>
    balance == null ? null : balance < 0 ? "short" : f.reserve > 0 && balance < f.reserve ? "reserve" : null;

  const rows: ForecastRow[] = [];
  for (const m of f.months) {
    const notes: ForecastRow["notes"] = [];
    if (m.month !== f.currentMonth) {
      for (const a of annual) {
        if (a.amount > 0 && a.sourceMonth.slice(5) === m.month.slice(5)) {
          notes.push({ text: t.forecast.includes(t.trend.annual[a.name]), amount: a.amount, private: true });
        }
      }
    }
    if (spendingByCycle.find((g) => g.month === m.month)?.override != null) notes.push({ text: t.forecast.spendingAdjusted });
    if (m.overdue > 0) notes.push({ text: t.forecast.overdue, amount: m.overdue });

    const milestones = f.milestones.filter((x) => x.month === m.month);
    const balance = milestones[0]?.before ? milestones[0].before.base : m.balance;
    rows.push({
      key: m.month,
      title: capitalize(longMonth(t, m.month, year)),
      until: m.month === f.currentMonth && f.hasFlows && cycle ? t.forecast.until(shortDate(t, cycle.end, year)) : undefined,
      milestone: false,
      income: f.hasFlows ? m.expectedIncome : 0,
      spending: f.hasFlows ? m.expectedSpending : 0,
      expenses: round(m.expenses - m.atMilestones),
      balance,
      alert: alert(balance),
      notes,
    });
    for (const x of milestones) {
      const after = x.after ? x.after.base : null;
      rows.push({
        key: x.kind,
        title: `${t.milestones[x.kind].title} · ${shortDate(t, x.date, year)}`,
        milestone: true,
        income: 0,
        spending: 0,
        expenses: x.unpaid,
        balance: after,
        alert: alert(after),
        notes: x.unpaidCount ? [{ text: t.expenseCount(x.unpaidCount) }] : [],
      });
    }
  }
  return rows;
}

export interface PossibleSpending {
  month: string;
  /** Categories that had unusual spending in this month, last year. */
  peaks: { name: string; total: number }[];
}

/**
 * Possible spending in the current month and the next one: what, in the same month last year,
 * was far above usual. In the current month, only what hasn't happened yet (less than half
 * already spent in that category). Not part of the forecast; a reminder to adjust the month.
 */
export function possibleSpending(trend: Pick<Trend, "peaks" | "currentMonth" | "currentCycle">, months: readonly string[]): PossibleSpending[] {
  return months
    .slice(0, 2)
    .map((month) => ({
      month,
      peaks: peaksForCycle(trend.peaks, month)
        .filter((g) => month !== trend.currentMonth || (trend.currentCycle.spentByCategory[g.name] ?? 0) < g.total / 2)
        .map((g) => ({ name: g.name, total: g.total })),
    }))
    .filter((x) => x.peaks.length > 0);
}
