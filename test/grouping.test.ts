import { describe, expect, test } from "vitest";
import { groupByMonth, totalsByCategory } from "@/lib/grouping";

const e = (id: number, amount: number, month: string, status: "planned" | "paid" = "planned", category = "other") => ({
  id,
  amount,
  month,
  status,
  category,
});

describe("groupByMonth", () => {
  test("overdue ones go to the current month; old paid ones stay in their month", () => {
    const g = groupByMonth([e(1, 100, "2026-08"), e(2, 50, "2026-08", "paid"), e(3, 300, "2026-10"), e(4, 20, "2026-12")], "2026-10");
    expect(g.map((x) => x.month)).toEqual(["2026-08", "2026-10", "2026-12"]);
    expect(g[1].expenses.map((x) => [x.id, x.overdue])).toEqual([
      [1, true],
      [3, false],
    ]);
    expect(g[1].unpaid).toBe(400);
    expect(g[0].paid).toBe(50);
  });

  test("within the month: unpaid before paid, largest amount first", () => {
    const g = groupByMonth([e(1, 10, "2026-11", "paid"), e(2, 5, "2026-11"), e(3, 50, "2026-11")], "2026-10");
    expect(g[0].expenses.map((x) => x.id)).toEqual([3, 2, 1]);
  });
});

describe("totalsByCategory", () => {
  test("separates paid and unpaid and sorts by total", () => {
    const t = totalsByCategory([
      e(1, 100, "2026-11", "paid", "renovation"),
      e(2, 0.1, "2026-11", "planned", "renovation"),
      e(3, 0.2, "2026-11", "planned", "renovation"),
      e(4, 50, "2026-12", "planned", "furniture"),
    ]);
    expect(t).toEqual([
      { category: "renovation", paid: 100, unpaid: 0.3, total: 100.3 },
      { category: "furniture", paid: 0, unpaid: 50, total: 50 },
    ]);
  });
});
