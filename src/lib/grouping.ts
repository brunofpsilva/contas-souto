// Groups expenses by month for the lists. An unpaid expense from a past month shows up in
// the current month, marked as overdue (as in the calculation).
import type { Status } from "./domain";

export interface GroupableExpense {
  id: number;
  amount: number;
  month: string;
  status: Status;
}

export interface MonthGroup<T> {
  month: string;
  expenses: Array<T & { overdue: boolean }>;
  unpaid: number;
  paid: number;
}

const round = (v: number) => Math.round(v * 100) / 100;

export function groupByMonth<T extends GroupableExpense>(list: readonly T[], currentMonth: string): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>();
  for (const e of list) {
    const overdue = e.status !== "paid" && e.month < currentMonth;
    const month = overdue ? currentMonth : e.month;
    let g = groups.get(month);
    if (!g) {
      g = { month, expenses: [], unpaid: 0, paid: 0 };
      groups.set(month, g);
    }
    g.expenses.push({ ...e, overdue });
    if (e.status === "paid") g.paid += e.amount;
    else g.unpaid += e.amount;
  }
  return [...groups.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((g) => ({
      ...g,
      unpaid: round(g.unpaid),
      paid: round(g.paid),
      // Overdue first, then unpaid, then paid; within each, the largest amount first.
      expenses: g.expenses.sort(
        (a, b) =>
          Number(b.overdue) - Number(a.overdue) ||
          Number(a.status === "paid") - Number(b.status === "paid") ||
          b.amount - a.amount ||
          a.id - b.id,
      ),
    }));
}

/** Total by category, with paid and unpaid apart (for the budget screen). */
export function totalsByCategory<T extends GroupableExpense & { category: string }>(list: readonly T[]) {
  const m = new Map<string, { category: string; paid: number; unpaid: number }>();
  for (const e of list) {
    const t = m.get(e.category) ?? { category: e.category, paid: 0, unpaid: 0 };
    if (e.status === "paid") t.paid += e.amount;
    else t.unpaid += e.amount;
    m.set(e.category, t);
  }
  return [...m.values()]
    .map((t) => ({ ...t, paid: round(t.paid), unpaid: round(t.unpaid), total: round(t.paid + t.unpaid) }))
    .sort((a, b) => b.total - a.total);
}
