// Budget by room of the house. It counts everything recorded (paid + unpaid).
// It is only a comparison: it is not part of the balance forecast.
import type { Status } from "./domain";

export interface BudgetRoom {
  id: number;
  name: string;
  /** null = no budget */
  budget: number | null;
}

export interface BudgetExpense {
  amount: number;
  status: Status;
  roomId: number | null;
}

export interface BudgetTotals {
  paid: number;
  unpaid: number;
  total: number;
  expenseCount: number;
}

export interface BudgetRow extends BudgetTotals {
  id: number;
  name: string;
  budget: number | null;
  /** Budget − total (negative = over). null without a budget. */
  remaining: number | null;
}

export interface BudgetSummary {
  /** In the order of the rooms. */
  rooms: BudgetRow[];
  /** Expenses with no room (outside the budget). */
  unassigned: BudgetTotals;
  /**
   * Overall budget: the sum of the rooms' budgets; the spending is that of all rooms (those
   * without a budget count too). Expenses with no room stay out.
   */
  overall: { budget: number; paid: number; unpaid: number; total: number; remaining: number; overCount: number };
}

const round = (v: number) => Math.round(v * 100) / 100;

export function computeBudget(rooms: readonly BudgetRoom[], expenses: readonly BudgetExpense[]): BudgetSummary {
  const sums = new Map<number | null, { paid: number; unpaid: number; n: number }>();
  const ids = new Set(rooms.map((r) => r.id));
  for (const e of expenses) {
    // A room that no longer exists counts as no room (the database already does this on delete).
    const key = e.roomId != null && ids.has(e.roomId) ? e.roomId : null;
    const s = sums.get(key) ?? { paid: 0, unpaid: 0, n: 0 };
    if (e.status === "paid") s.paid += e.amount;
    else s.unpaid += e.amount;
    s.n++;
    sums.set(key, s);
  }

  const totals = (id: number | null): BudgetTotals => {
    const s = sums.get(id) ?? { paid: 0, unpaid: 0, n: 0 };
    return { paid: round(s.paid), unpaid: round(s.unpaid), total: round(s.paid + s.unpaid), expenseCount: s.n };
  };

  const rows = rooms.map((r): BudgetRow => {
    const t = totals(r.id);
    return { id: r.id, name: r.name, budget: r.budget, ...t, remaining: r.budget == null ? null : round(r.budget - t.total) };
  });
  const sum = (f: (l: BudgetRow) => number) => round(rows.reduce((t, l) => t + f(l), 0));
  const budget = sum((l) => l.budget ?? 0);
  const total = sum((l) => l.total);
  return {
    rooms: rows,
    unassigned: totals(null),
    overall: {
      budget,
      paid: sum((l) => l.paid),
      unpaid: sum((l) => l.unpaid),
      total,
      remaining: round(budget - total),
      overCount: rows.filter((l) => l.remaining != null && l.remaining < 0).length,
    },
  };
}
