// Forecast calculation: balance available today, minus the unpaid expenses, plus what is
// expected from day-to-day life (salaries minus spending), month by month, up to the deed or
// the end of construction (whichever is later), or up to the last expense if that comes later.
// Rules:
// - paid expenses don't count, because they have already left the accounts;
// - an unpaid expense from a past month counts in the current month and is "overdue";
// - there are two dated milestones: the deed and the end of construction (final payment to the
//   contractor). Each expense can be paid at one of them and then counts in that milestone's
//   month. A milestone only counts if it hasn't passed yet; once it has, its expenses count by
//   their stored month, like the others;
// - with milestones (today or later): the horizon runs from the current month to the month of
//   the last one. In a milestone's month, day-to-day flows and expenses with their own month
//   count before, and the milestone's expenses after; two milestones in the same month follow
//   the order of their dates. If there are unpaid expenses after the last milestone, the
//   forecast continues to the month of the last one, in the same way;
// - without milestones: at least 6 months, extended to the last expense (36 at most);
// - day-to-day flows come from outside (the trend from Wallet transactions) and carry an
//   optimistic/pessimistic range; without them the three balances are the same.

import { cycleOf } from "./cycle";
import type { Status } from "./domain";
import { monthOfDate, type Milestone } from "./milestones";
import { addMonths, type Month } from "./months";

export interface ForecastExpense {
  amount: number;
  month: string; // YYYY-MM
  status: Status;
  atDeed?: boolean;
  atConstructionEnd?: boolean;
}

export interface Range {
  base: number;
  optimistic: number;
  pessimistic: number;
}

/** Income and outgoings expected in a month, outside the house expenses. */
export interface MonthFlow {
  month: string;
  income: Range;
  outgoings: Range;
}

export interface ForecastMonth {
  month: Month;
  /** Milestones that fall in this cycle, in date order. */
  milestones: Milestone[];
  /** Unpaid expenses that go out this month (including the milestones' ones). */
  expenses: number;
  overdue: number;
  /** Part of `expenses` paid at this month's milestones. */
  atMilestones: number;
  /** Day-to-day flow (base scenario). */
  expectedIncome: number;
  expectedSpending: number;
  balance: number | null;
  balanceOptimistic: number | null;
  balancePessimistic: number | null;
}

export interface MilestoneResult {
  kind: Milestone;
  date: string;
  month: Month;
  /** Balance right before and right after this milestone's payments. */
  before: Range | null;
  after: Range | null;
  unpaid: number;
  unpaidCount: number;
  paid: number;
  paidCount: number;
}

export type OverallStatus = "no-balances" | "nothing-to-pay" | "short" | "below-reserve" | "ok";

export interface ForecastSummary {
  available: number | null;
  unpaid: number;
  unpaidCount: number;
  paid: number;
  paidCount: number;
  finalBalance: number | null;
  status: OverallStatus;
  /** First month where money runs short or drops below the reserve. */
  alertMonth: Month | null;
  /** Lowest balance in the horizon (when there is no alert). */
  minBalance: number | null;
}

export interface Forecast {
  currentMonth: Month;
  months: ForecastMonth[];
  summary: ForecastSummary;
  reserve: number;
  /** Milestones from today on, in date order. */
  milestones: MilestoneResult[];
  /** null without a date or once it has passed. */
  deed: MilestoneResult | null;
  construction: MilestoneResult | null;
  /** The last milestone (the forecast may continue after it, up to the last expense). */
  end: MilestoneResult | null;
  /** From today to the last milestone (base scenario); null without milestones. */
  path: { income: number; spending: number; houseExpenses: number } | null;
  /** Unpaid expenses beyond the 36-month limit: not in the balance. */
  beyondHorizon: { count: number; amount: number };
  /** Day-to-day flows are part of the calculation (and so there is a range). */
  hasFlows: boolean;
}

export const MIN_MONTHS = 6;
export const MAX_MONTHS = 36;

const round = (v: number) => Math.round(v * 100) / 100;
const SCENARIOS = ["base", "optimistic", "pessimistic"] as const;
const addToRange = (r: Range, v: number): Range => ({
  base: round(r.base + v),
  optimistic: round(r.optimistic + v),
  pessimistic: round(r.pessimistic + v),
});

export function isOverdue(e: ForecastExpense, currentMonth: string): boolean {
  return e.status !== "paid" && e.month < currentMonth;
}

/** The milestone at which the expense is paid, if any. */
export function milestoneOf(e: Pick<ForecastExpense, "atDeed" | "atConstructionEnd">): Milestone | null {
  return e.atDeed ? "deed" : e.atConstructionEnd ? "construction" : null;
}

export function computeForecast({
  expenses,
  available,
  reserve = 0,
  today = new Date(),
  minMonths = MIN_MONTHS,
  deedDate = null,
  constructionEndDate = null,
  flows = [],
}: {
  expenses: readonly ForecastExpense[];
  available: number | null;
  reserve?: number;
  today?: Date;
  minMonths?: number;
  /** YYYY-MM-DD */
  deedDate?: string | null;
  /** YYYY-MM-DD */
  constructionEndDate?: string | null;
  flows?: readonly MonthFlow[];
}): Forecast {
  const current = cycleOf(today);
  const unpaid = expenses.filter((e) => e.status !== "paid");
  const paid = expenses.filter((e) => e.status === "paid");

  // A milestone only sets the horizon if it hasn't passed. On the same day, the deed comes first.
  const dates: [Milestone, string | null][] = [
    ["deed", deedDate],
    ["construction", constructionEndDate],
  ];
  const active = dates
    .flatMap(([kind, date]) => (date && monthOfDate(date) >= current ? [{ kind, date, month: monthOfDate(date) }] : []))
    .sort((a, b) => a.date.localeCompare(b.date));
  const milestoneMonth = new Map<Milestone, string>(active.map((a) => [a.kind, a.month]));
  const endMonth = active.at(-1)?.month ?? null;

  // The horizon runs to the latest of the last milestone and the unpaid expenses (milestone
  // expenses count in the milestone's month). Without milestones, at least 6 months.
  let last: string = endMonth ?? addMonths(current, minMonths - 1);
  for (const e of unpaid) {
    const m = milestoneOf(e);
    if (m && milestoneMonth.has(m)) continue;
    if (e.month > last) last = e.month;
  }

  const flowByMonth = new Map(flows.map((f) => [f.month, f]));
  const months: ForecastMonth[] = [];
  for (let k = current; k <= last && months.length < MAX_MONTHS; k = addMonths(k, 1)) {
    const f = flowByMonth.get(k);
    months.push({
      month: k,
      milestones: active.filter((a) => a.month === k).map((a) => a.kind),
      expenses: 0,
      overdue: 0,
      atMilestones: 0,
      expectedIncome: f ? round(f.income.base) : 0,
      expectedSpending: f ? round(f.outgoings.base) : 0,
      balance: null,
      balanceOptimistic: null,
      balancePessimistic: null,
    });
  }
  const byMonth = new Map(months.map((m) => [m.month as string, m]));
  const byMilestone = new Map<Milestone, number>();
  const beyond = { count: 0, amount: 0 };
  for (const e of unpaid) {
    const m = milestoneOf(e);
    const mMonth = m ? milestoneMonth.get(m) : undefined;
    if (m && mMonth) {
      // Always counts in the milestone's month, whatever the stored month.
      const target = byMonth.get(mMonth);
      if (!target) continue; // beyond the 36-month limit
      target.expenses += e.amount;
      target.atMilestones += e.amount;
      byMilestone.set(m, (byMilestone.get(m) ?? 0) + e.amount);
      continue;
    }
    const overdue = e.month < current;
    const target = byMonth.get(overdue ? current : e.month);
    if (!target) {
      if (e.month > (months.at(-1)?.month ?? current)) {
        beyond.count++;
        beyond.amount += e.amount;
      }
      continue; // beyond the 36-month limit
    }
    target.expenses += e.amount;
    if (overdue) target.overdue += e.amount;
  }

  const milestoneBalances = new Map<Milestone, { before: Range; after: Range }>();
  const balance = { base: available, optimistic: available, pessimistic: available };
  for (const m of months) {
    m.expenses = round(m.expenses);
    m.overdue = round(m.overdue);
    m.atMilestones = round(m.atMilestones);
    if (balance.base == null) continue;
    const f = flowByMonth.get(m.month);
    for (const s of SCENARIOS) {
      const net = f ? f.income[s] - f.outgoings[s] : 0;
      balance[s] = round(balance[s]! + net - m.expenses);
    }
    // Balance before the month's milestones and after each one, in date order.
    let running = addToRange({ base: balance.base, optimistic: balance.optimistic!, pessimistic: balance.pessimistic! }, m.atMilestones);
    for (const kind of m.milestones) {
      const afterIt = addToRange(running, -(byMilestone.get(kind) ?? 0));
      milestoneBalances.set(kind, { before: running, after: afterIt });
      running = afterIt;
    }
    m.balance = balance.base;
    m.balanceOptimistic = balance.optimistic;
    m.balancePessimistic = balance.pessimistic;
  }

  const sum = (l: readonly ForecastExpense[]) => round(l.reduce((s, e) => s + e.amount, 0));
  const lastMonth = months[months.length - 1];
  const summary: ForecastSummary = {
    available,
    unpaid: sum(unpaid),
    unpaidCount: unpaid.length,
    paid: sum(paid),
    paidCount: paid.length,
    finalBalance: lastMonth ? lastMonth.balance : available,
    status: "ok",
    alertMonth: null,
    minBalance: null,
  };

  if (available == null) summary.status = "no-balances";
  else {
    const withBalance = months.filter((m): m is ForecastMonth & { balance: number } => m.balance != null);
    const negative = withBalance.find((m) => m.balance < 0);
    const low = reserve > 0 ? withBalance.find((m) => m.balance < reserve) : undefined;
    const hasExpenses = months.some((m) => m.expenses > 0);
    if (negative) {
      summary.status = "short";
      summary.alertMonth = negative.month;
    } else if (low) {
      summary.status = "below-reserve";
      summary.alertMonth = low.month;
    } else {
      summary.status = hasExpenses ? "ok" : "nothing-to-pay";
      summary.minBalance = withBalance.length ? Math.min(...withBalance.map((m) => m.balance)) : null;
    }
  }

  const milestones: MilestoneResult[] = active.map((a) => {
    const own = expenses.filter((e) => milestoneOf(e) === a.kind);
    const ownUnpaid = own.filter((e) => e.status !== "paid");
    const ownPaid = own.filter((e) => e.status === "paid");
    const b = milestoneBalances.get(a.kind);
    return {
      ...a,
      before: b?.before ?? null,
      after: b?.after ?? null,
      unpaid: sum(ownUnpaid),
      unpaidCount: ownUnpaid.length,
      paid: sum(ownPaid),
      paidCount: ownPaid.length,
    };
  });
  const totalAtMilestones = months.reduce((s, x) => s + x.atMilestones, 0);
  const untilEnd = months.filter((x) => endMonth != null && x.month <= endMonth);

  return {
    currentMonth: current,
    months,
    summary,
    reserve,
    milestones,
    deed: milestones.find((m) => m.kind === "deed") ?? null,
    construction: milestones.find((m) => m.kind === "construction") ?? null,
    end: milestones.at(-1) ?? null,
    path: milestones.length
      ? {
          income: round(untilEnd.reduce((s, x) => s + x.expectedIncome, 0)),
          spending: round(untilEnd.reduce((s, x) => s + x.expectedSpending, 0)),
          houseExpenses: round(untilEnd.reduce((s, x) => s + x.expenses, 0) - totalAtMilestones),
        }
      : null,
    beyondHorizon: { count: beyond.count, amount: round(beyond.amount) },
    hasFlows: flows.length > 0,
  };
}
