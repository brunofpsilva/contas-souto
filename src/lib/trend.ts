// Day-to-day forecast from the real Wallet transactions (pure function, tested).
//
// Method (simple to explain):
// - Each month is a salary cycle (see cycle.ts); a transaction's month in Wallet already is the cycle.
// - Window: the last 12 full cycles. No transfers and no one-off house expenses.
// - Salaries: a fixed amount (trend-rules.ts). Other income and rent: median of the cycles.
// - Day-to-day spending: median of the window's cycles, the same in every future cycle. Each
//   cycle can have a hand-written amount for spending and rent, which replaces the automatic one.
// - Peaks (a category far above usual in a cycle of the last year) don't change the numbers:
//   they warn about possible spending in the same cycle this year.
// - Christmas and holiday allowances, bonuses and the tax refund repeat once a year:
//   they come in the same month as last year, with the same amount.
// - In the current cycle only what is still to come in or go out counts (the available
//   balance already includes the rest). The day-to-day spending still to come is the median of
//   what was spent, in the window's cycles, over the same last days of the cycle (by the real
//   date, which may be in the note).
// - The optimistic/pessimistic scenarios are still calculated but no longer shown.
//
// Everything shown on screen is returned as ids and numbers; the words come from src/i18n.

import { actualDay, addDays, cycleEnd, cycleOf, cycleStart, daysBetween } from "./cycle";
import type { MonthFlow, Range } from "./forecast";
import { addMonths, dayOf, type Month } from "./months";
import { RULES, type FixedSalary, type TrendRules } from "./trend-rules";

export interface TrendTransaction {
  month: string;
  amount: number;
  currency?: string;
  categoryId: string | null;
  parentCategoryId?: string | null;
  categoryName?: string;
  categoryGroup: string;
  note: string;
  isTransfer: boolean;
  /** Date recorded in Wallet (to know on which day of the cycle it was spent). */
  date?: Date;
}

/** Category name used when Wallet has none (the UI shows "Uncategorised"). */
export const UNCATEGORISED = "";

export interface CurrentCycle {
  month: Month;
  /** "YYYY-MM-DD" */
  start: string;
  end: string;
  /** Days left, counting today. */
  daysLeft: number;
  /** Day-to-day spending still expected this cycle (median of the column below). */
  spendingLeft: number;
  /** How much was spent in each window cycle over the same last days. */
  byCycle: { month: Month; amount: number }[];
  /** Already spent this cycle, by category (so we don't warn about what already happened). */
  spentByCategory: Record<string, number>;
}

export type ComponentId = "salaries" | "otherIncome" | "spending" | "rent";
export type AnnualType = "allowance" | "bonus" | "taxRefund";
export type AnnualName = "christmasAllowance" | "holidayAllowance" | "bonus" | "taxRefund";

/** How a component's monthly amount is worked out. */
export type TrendRule =
  | { kind: "fixed"; salaries: FixedSalary[] }
  | { kind: "secondLowest"; months: number }
  | { kind: "usual"; months: number };

export interface TrendComponent {
  id: ComponentId;
  direction: "in" | "out";
  /** Total of each window month, always positive for the component's direction. */
  values: { month: Month; amount: number }[];
  value: Range;
  rule: TrendRule;
  /** Already in/out in the current month. */
  actualThisMonth: number;
  /** Heaviest categories (only to explain). */
  categories: { name: string; median: number }[];
}

export interface AnnualIncome {
  type: AnnualType;
  name: AnnualName;
  /** Month it came in last year. */
  sourceMonth: Month;
  amount: number;
  pessimistic: number;
}

/** A category's peak in a cycle of the last year: warns about possible spending in the same cycle. */
export interface SpendingPeak {
  name: string;
  sourceMonth: Month;
  /** What was spent in that cycle. */
  total: number;
  /** The category's usual amount (median of the cycles). */
  usual: number;
}

/** Day-to-day spending and rent of a forecast cycle. */
export interface CycleSpending {
  month: Month;
  /** Automatic forecast (in the current cycle, what is still to come). */
  automatic: number;
  /** Hand-written amount, if any. */
  override: number | null;
}

export type TrendWarning =
  | { code: "noTransactions" }
  | { code: "fewMonths"; months: number; window: number }
  | { code: "uncategorised"; percent: number }
  | { code: "noSalaries" };

export interface Trend {
  currentMonth: Month;
  currentCycle: CurrentCycle;
  peaks: SpendingPeak[];
  spendingByCycle: CycleSpending[];
  window: { from: Month; to: Month };
  components: TrendComponent[];
  annual: AnnualIncome[];
  /** Income and outgoings expected from the current month on (empty without transactions). */
  flows: MonthFlow[];
  /** Net balance of a normal month (without annual income). */
  monthlyNet: Range;
  warnings: TrendWarning[];
}

type Classification = { component: ComponentId } | { annual: AnnualType } | null;

const round = (v: number) => Math.round(v * 100) / 100;
const sorted = (v: number[]) => [...v].sort((a, b) => a - b);

export function median(v: number[]): number {
  if (!v.length) return 0;
  const o = sorted(v);
  const m = Math.floor(o.length / 2);
  return round(o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2);
}

/** 2nd lowest (or the lowest, with fewer than 3 values). */
function secondLowest(v: number[]): number {
  const o = sorted(v);
  return o.length >= 3 ? o[1] : (o[0] ?? 0);
}

function secondHighest(v: number[]): number {
  const o = sorted(v);
  return o.length >= 3 ? o[o.length - 2] : (o[o.length - 1] ?? 0);
}

export function classify(t: TrendTransaction, r: TrendRules = RULES): Classification {
  if (t.isTransfer) return null;
  if ((t.currency ?? "EUR") !== "EUR") return null;
  const cat = t.categoryId ?? "";
  const parent = t.parentCategoryId ?? "";
  if (r.excludedCategories.includes(cat) || r.excludedCategories.includes(parent)) return null;
  const is = (id: string) => cat === id || parent === id;

  if (t.categoryGroup === r.incomeGroup) {
    if (is(r.salaryCategory)) return r.bonusNote.test(t.note) ? { annual: "bonus" } : { component: "salaries" };
    if (is(r.allowanceCategory) && r.annualAllowanceNote.test(t.note)) return { annual: "allowance" };
    if (is(r.refundCategory) && r.taxRefundNote.test(t.note)) return { annual: "taxRefund" };
    return { component: "otherIncome" };
  }
  if (r.rentCategories.some(is)) return { component: "rent" };
  return { component: "spending" };
}

const DIRECTIONS: Record<ComponentId, "in" | "out"> = {
  salaries: "in",
  otherIncome: "in",
  spending: "out",
  rent: "out",
};

function annualName(type: AnnualType, note: string): AnnualName {
  if (type !== "allowance") return type;
  return /natal/i.test(note) ? "christmasAllowance" : "holidayAllowance";
}

function rangeOf(id: ComponentId, values: number[], r: TrendRules): { value: Range; rule: TrendRule } {
  if (id === "salaries" && r.fixedSalaries.length) {
    const total = round(r.fixedSalaries.reduce((s, x) => s + x.amount, 0));
    return { value: { base: total, optimistic: total, pessimistic: total }, rule: { kind: "fixed", salaries: r.fixedSalaries } };
  }
  if (id === "salaries") {
    return {
      value: { base: secondLowest(values), optimistic: median(values), pessimistic: round(Math.min(...values, Infinity) || 0) },
      rule: { kind: "secondLowest", months: r.windowMonths },
    };
  }
  const usual: TrendRule = { kind: "usual", months: r.windowMonths };
  if (id === "otherIncome") {
    return { value: { base: median(values), optimistic: secondHighest(values), pessimistic: secondLowest(values) }, rule: usual };
  }
  return { value: { base: median(values), optimistic: secondLowest(values), pessimistic: secondHighest(values) }, rule: usual };
}

// A peak is a cycle in which the category went over €100 and over twice the usual + €50.
const PEAK_MIN = 100;
const PEAK_TIMES = 2;
const PEAK_MARGIN = 50;

/** Peaks of each category in the window's cycles (positive spending by category and cycle). */
export function spendingPeaks(byCategory: ReadonlyMap<string, ReadonlyMap<string, number>>, months: readonly Month[]): SpendingPeak[] {
  const peaks: SpendingPeak[] = [];
  for (const [name, byMonth] of byCategory) {
    const values = months.map((month) => byMonth.get(month) ?? 0);
    const usual = median(values);
    months.forEach((month, i) => {
      const v = values[i];
      if (v > PEAK_MIN && v > PEAK_TIMES * usual + PEAK_MARGIN) peaks.push({ name, sourceMonth: month, total: round(v), usual });
    });
  }
  return peaks.sort((a, b) => a.sourceMonth.localeCompare(b.sourceMonth) || b.total - a.total);
}

/** Peaks of the same cycle last year: possible spending this cycle. */
export function peaksForCycle(peaks: readonly SpendingPeak[], month: string): SpendingPeak[] {
  return peaks.filter((p) => p.sourceMonth.slice(5) === month.slice(5));
}

export function computeTrend({
  transactions,
  today = new Date(),
  months = 36,
  rules = RULES,
  spendingOverrides = new Map(),
}: {
  transactions: readonly TrendTransaction[];
  today?: Date;
  months?: number;
  rules?: TrendRules;
  /** Cycle YYYY-MM -> hand-written day-to-day spending. */
  spendingOverrides?: ReadonlyMap<string, number>;
}): Trend {
  const current = cycleOf(today);
  const end = cycleEnd(current);
  const daysLeft = Math.max(1, daysBetween(dayOf(today), end) + 1);
  const from = addMonths(current, -rules.windowMonths);
  const to = addMonths(current, -1);
  const windowMonths: Month[] = [];
  for (let k = from; k <= to; k = addMonths(k, 1)) windowMonths.push(k);
  // In each window cycle, the first of the "same last days" that are left now.
  const finalStart = new Map(windowMonths.map((k) => [k as string, addDays(cycleEnd(k), -(daysLeft - 1))]));
  const finalSpending = new Map<string, number>();
  const currentByCategory = new Map<string, number>();
  const annualStart = addMonths(current, -12);

  // Totals by component and month (signed), annual income and what already happened this month.
  const totals = new Map<ComponentId, Map<string, number>>();
  const byCategory = new Map<ComponentId, Map<string, Map<string, number>>>();
  const annual: AnnualIncome[] = [];
  const actual = new Map<ComponentId | AnnualType, number>();
  let uncategorised = 0;
  let windowTotal = 0;
  const monthsWithData = new Set<string>();

  for (const t of transactions) {
    const c = classify(t, rules);
    if (!c) continue;
    if (t.month >= from && t.month <= to) {
      monthsWithData.add(t.month);
      windowTotal += Math.abs(t.amount);
      if (!t.categoryId || t.categoryGroup === "unknown_records") uncategorised += Math.abs(t.amount);
    }
    if ("annual" in c) {
      if (t.month === current) actual.set(c.annual, (actual.get(c.annual) ?? 0) + t.amount);
      else if (t.month >= annualStart && t.month < current) {
        const existing = annual.find((a) => a.type === c.annual && a.sourceMonth === t.month);
        if (existing) existing.amount = round(existing.amount + t.amount);
        else annual.push({ type: c.annual, name: annualName(c.annual, t.note), sourceMonth: t.month as Month, amount: t.amount, pessimistic: 0 });
      }
      continue;
    }
    const id = c.component;
    if (t.month === current) {
      actual.set(id, (actual.get(id) ?? 0) + t.amount);
      if (id === "spending") {
        const name = t.categoryName || UNCATEGORISED;
        currentByCategory.set(name, (currentByCategory.get(name) ?? 0) - t.amount);
      }
    }
    if (t.month < from || t.month > to) continue;
    if (id === "spending" && t.date && actualDay({ month: t.month, date: t.date, note: t.note }) >= finalStart.get(t.month)!) {
      finalSpending.set(t.month, (finalSpending.get(t.month) ?? 0) - t.amount);
    }
    const tot = totals.get(id) ?? new Map<string, number>();
    tot.set(t.month, (tot.get(t.month) ?? 0) + t.amount);
    totals.set(id, tot);
    const pc = byCategory.get(id) ?? new Map<string, Map<string, number>>();
    const name = t.categoryName || UNCATEGORISED;
    const cm = pc.get(name) ?? new Map<string, number>();
    cm.set(t.month, (cm.get(t.month) ?? 0) + t.amount);
    pc.set(name, cm);
    byCategory.set(id, pc);
  }

  for (const a of annual) {
    a.amount = round(a.amount);
    a.pessimistic = a.type === "allowance" ? a.amount : 0;
  }
  annual.sort((a, b) => a.sourceMonth.localeCompare(b.sourceMonth) || a.type.localeCompare(b.type));

  const sign = (id: ComponentId) => (DIRECTIONS[id] === "in" ? 1 : -1);
  const components: TrendComponent[] = (Object.keys(DIRECTIONS) as ComponentId[])
    .filter((id) => totals.has(id))
    .map((id) => {
      const tot = totals.get(id)!;
      const values = windowMonths.map((month) => ({ month, amount: round(sign(id) * (tot.get(month) ?? 0)) }));
      const { value, rule } = rangeOf(
        id,
        values.map((v) => v.amount),
        rules,
      );
      const categories = [...(byCategory.get(id) ?? new Map()).entries()]
        .map(([name, cm]) => ({ name, median: median(windowMonths.map((month) => sign(id) * (cm.get(month) ?? 0))) }))
        .filter((c) => c.median > 0)
        .sort((a, b) => b.median - a.median)
        .slice(0, 6);
      return {
        id,
        direction: DIRECTIONS[id],
        values,
        value,
        rule,
        actualThisMonth: round(Math.max(0, sign(id) * (actual.get(id) ?? 0))),
        categories,
      };
    });

  // Peaks by category: only for warnings.
  const spendingByCategory = new Map(
    [...(byCategory.get("spending") ?? new Map<string, Map<string, number>>()).entries()].map(([name, cm]) => [
      name,
      new Map([...cm.entries()].map(([month, v]) => [month, -v])),
    ]),
  );
  const peaks = spendingPeaks(spendingByCategory, windowMonths);
  const spendingComponent = components.find((c) => c.id === "spending");
  const rentComponent = components.find((c) => c.id === "rent");

  const warnings: TrendWarning[] = [];
  if (!transactions.length) warnings.push({ code: "noTransactions" });
  else if (monthsWithData.size < rules.windowMonths) warnings.push({ code: "fewMonths", months: monthsWithData.size, window: rules.windowMonths });
  if (windowTotal > 0 && uncategorised / windowTotal > 0.05) warnings.push({ code: "uncategorised", percent: Math.round((uncategorised / windowTotal) * 100) });
  if (!components.some((c) => c.id === "salaries") && transactions.length) warnings.push({ code: "noSalaries" });

  const zero: Range = { base: 0, optimistic: 0, pessimistic: 0 };
  const scenarios = ["base", "optimistic", "pessimistic"] as const;
  const monthlyNet = { ...zero };
  for (const c of components) for (const k of scenarios) monthlyNet[k] = round(monthlyNet[k] + (c.direction === "in" ? 1 : -1) * c.value[k]);

  const byCycle = windowMonths.map((month) => ({ month, amount: round(finalSpending.get(month) ?? 0) }));
  const start = cycleStart(current);
  // On the first day of the cycle the whole cycle is left: it counts like the following ones.
  const cycleSpending = spendingComponent?.value.base ?? 0;
  const currentCycle: CurrentCycle = {
    month: current,
    start,
    end,
    daysLeft,
    spendingLeft: dayOf(today) <= start ? cycleSpending : median(byCycle.map((c) => c.amount)),
    byCycle,
    spentByCategory: Object.fromEntries([...currentByCategory].map(([k, v]) => [k, round(v)])),
  };

  const flows: MonthFlow[] = [];
  const spendingByCycle: CycleSpending[] = [];
  if (transactions.length) {
    for (let i = 0, k = current; i < months; i++, k = addMonths(k, 1)) {
      const income = { ...zero };
      const outgoings = { ...zero };
      // The hand-written amount replaces the cycle's day-to-day spending and rent.
      const autoSpending = k === current ? currentCycle.spendingLeft : cycleSpending;
      const autoRent = rentComponent
        ? k === current
          ? Math.max(0, rentComponent.value.base - rentComponent.actualThisMonth)
          : rentComponent.value.base
        : 0;
      const automatic = round(autoSpending + autoRent);
      const override = spendingOverrides.get(k) ?? null;
      if (spendingComponent || rentComponent) spendingByCycle.push({ month: k, automatic, override });
      for (const c of components) {
        const target = c.direction === "in" ? income : outgoings;
        for (const s of scenarios) {
          let v = c.value[s];
          if (c.id === "spending") v = override ?? autoSpending;
          else if (c.id === "rent") v = override != null ? 0 : autoRent;
          else if (k === current) v = Math.max(0, v - c.actualThisMonth);
          target[s] += v;
        }
      }
      const monthOfYear = k.slice(5);
      for (const type of ["allowance", "bonus", "taxRefund"] as const) {
        const ofMonth = annual.filter((a) => a.type === type && a.sourceMonth.slice(5) === monthOfYear);
        if (!ofMonth.length) continue;
        const already = k === current ? Math.max(0, actual.get(type) ?? 0) : 0;
        const amount = ofMonth.reduce((s, a) => s + a.amount, 0);
        const pess = ofMonth.reduce((s, a) => s + a.pessimistic, 0);
        income.base += Math.max(0, amount - already);
        income.optimistic += Math.max(0, amount - already);
        income.pessimistic += Math.max(0, pess - already);
      }
      for (const s of scenarios) {
        income[s] = round(income[s]);
        outgoings[s] = round(outgoings[s]);
      }
      flows.push({ month: k, income, outgoings });
    }
  }

  return { currentMonth: current, currentCycle, peaks, spendingByCycle, window: { from, to }, components, annual, flows, monthlyNet, warnings };
}
