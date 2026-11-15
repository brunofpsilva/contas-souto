import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeForecast, type ForecastExpense } from "@/lib/forecast";
import { forecastRows, forecastSums, possibleSpending } from "@/lib/forecast-view";

const today = new Date("2026-10-20T12:00:00Z"); // October cycle
const YEAR = 2026;
const e = (amount: number, month: string): ForecastExpense => ({ amount, month, status: "planned" });
const atDeed = (amount: number): ForecastExpense => ({ amount, month: "2026-12", status: "planned", atDeed: true });
const r = (v: number) => ({ base: v, optimistic: v, pessimistic: v });
const flows = ["2026-10", "2026-11", "2026-12", "2027-01"].map((month) => ({ month, income: r(3500), outgoings: r(2600) }));

describe("forecastSums", () => {
  test("with milestones, the sums run to the last one and add up", () => {
    const f = computeForecast({
      today,
      available: 40000,
      expenses: [e(10000, "2026-12"), atDeed(2000), e(500, "2027-01")],
      deedDate: "2026-12-15",
      flows,
    });
    const s = forecastSums(f, pt, YEAR)!;
    expect(s).toEqual({ balanceToday: 40000, income: 10500, spending: 7800, expenses: 12000, label: "Depois da escritura · 15 dez", balance: 30700 });
    expect(s.balanceToday + s.income - s.spending - s.expenses).toBe(s.balance);
    expect(forecastSums(f, en, YEAR)!.label).toBe("After the deed · 15 Dec");
  });

  test("without milestones, they run to the end of the forecast", () => {
    const f = computeForecast({ today, available: 5000, expenses: [e(1000, "2026-11")] });
    expect(forecastSums(f, pt, YEAR)).toEqual({ balanceToday: 5000, income: 0, spending: 0, expenses: 1000, label: "No fim de março de 2027", balance: 4000 });
  });

  test("without balances there are no sums", () => {
    expect(forecastSums(computeForecast({ today, available: null, expenses: [] }), pt)).toBeNull();
  });
});

describe("forecastRows", () => {
  test("the milestone's month shows the balance before it; the milestone shows the balance after", () => {
    const f = computeForecast({ today, available: 40000, reserve: 35000, expenses: [e(10000, "2026-12"), atDeed(2000)], deedDate: "2026-12-15", flows });
    const rows = forecastRows(f, pt, {
      year: YEAR,
      annual: [{ type: "allowance", name: "christmasAllowance", sourceMonth: "2025-12", amount: 1900, pessimistic: 1900 }],
      spendingByCycle: [{ month: "2026-11", automatic: 2600, override: 3000 }],
      cycle: { month: "2026-10", start: "2026-09-25", end: "2026-10-25", daysLeft: 6, spendingLeft: 0, byCycle: [], spentByCategory: {} },
    });
    expect(rows.map((x) => [x.key, x.title, x.balance, x.alert])).toEqual([
      ["2026-10", "Outubro", 40900, null],
      ["2026-11", "Novembro", 41800, null],
      ["2026-12", "Dezembro", 32700, "reserve"],
      ["deed", "Escritura · 15 dez", 30700, "reserve"],
    ]);
    expect(rows[0].until).toBe("até 25 out");
    expect(rows[1].notes).toEqual([{ text: "Gastos mensais ajustados" }]);
    expect(rows[2]).toMatchObject({
      milestone: false,
      income: 3500,
      spending: 2600,
      expenses: 10000,
      notes: [{ text: "Inclui Subsídio de Natal", amount: 1900, private: true }],
    });
    expect(rows[3]).toMatchObject({ milestone: true, income: 0, spending: 0, expenses: 2000, notes: [{ text: "1 despesa" }] });

    const english = forecastRows(f, en, { year: YEAR, annual: [{ type: "allowance", name: "christmasAllowance", sourceMonth: "2025-12", amount: 1900, pessimistic: 1900 }] });
    expect(english.map((x) => x.title)).toEqual(["October", "November", "December", "Deed · 15 Dec"]);
    expect(english[2].notes[0].text).toBe("Includes Christmas allowance");
  });

  test("without Wallet transactions there is no income or spending; overdue ones go in a note", () => {
    const f = computeForecast({ today, available: 1000, expenses: [e(1500, "2026-09")] });
    const [first] = forecastRows(f, pt, { year: YEAR });
    expect(first).toMatchObject({ income: 0, spending: 0, expenses: 1500, balance: -500, alert: "short", notes: [{ text: "Atrasadas", amount: 1500 }] });
    expect(first.until).toBeUndefined();
  });
});

describe("possibleSpending", () => {
  const peak = (name: string, sourceMonth: string, total: number) => ({ name, sourceMonth: sourceMonth as `${number}-${number}`, total, usual: 0 });
  const base = { start: "", end: "", daysLeft: 1, spendingLeft: 0, byCycle: [] };

  test("only the current month and the next one, and in the current month only what hasn't happened", () => {
    const t = {
      currentMonth: "2026-10" as const,
      peaks: [peak("Seguros", "2025-10", 600), peak("Prendas", "2025-10", 300), peak("Viagens", "2025-11", 800), peak("Carro", "2025-12", 900)],
      currentCycle: { ...base, month: "2026-10" as const, spentByCategory: { Seguros: 590 } },
    };
    expect(possibleSpending(t, ["2026-10", "2026-11", "2026-12"])).toEqual([
      { month: "2026-10", peaks: [{ name: "Prendas", total: 300 }] },
      { month: "2026-11", peaks: [{ name: "Viagens", total: 800 }] },
    ]);
  });
});
