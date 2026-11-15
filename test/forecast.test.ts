import { describe, expect, test } from "vitest";
import { computeForecast, isOverdue, type ForecastExpense } from "@/lib/forecast";

const today = new Date("2026-10-20T12:00:00Z");
const e = (amount: number, month: string, status: ForecastExpense["status"] = "planned"): ForecastExpense => ({
  amount,
  month,
  status,
});

// Cases from the old version (casa-nova/test/previsao.test.js)
describe("cases from the old version", () => {
  test("subtracts unpaid expenses month by month and ignores paid ones", () => {
    const f = computeForecast({
      today,
      available: 10000,
      expenses: [e(1500, "2026-11"), e(500, "2026-11"), e(3000, "2027-01"), e(999, "2026-10", "paid")],
    });
    expect(f.months.map((m) => m.month)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"]);
    expect(f.months.map((m) => m.balance)).toEqual([10000, 8000, 8000, 5000, 5000, 5000]);
    expect(f.summary.unpaid).toBe(5000);
    expect(f.summary.paid).toBe(999);
    expect(f.summary.status).toBe("ok");
  });

  test("overdue expenses count in the current month", () => {
    const f = computeForecast({ today, available: 100, expenses: [e(40, "2026-08")] });
    expect(f.months[0].expenses).toBe(40);
    expect(f.months[0].overdue).toBe(40);
  });

  test("warns about the first month without money and the month below the reserve", () => {
    const exp = [e(800, "2026-12"), e(500, "2027-02")];
    expect(computeForecast({ today, available: 1000, expenses: exp }).summary.alertMonth).toBe("2027-02");
    const s = computeForecast({ today, available: 1500, expenses: exp, reserve: 500 }).summary;
    expect(s.status).toBe("below-reserve");
    expect(s.alertMonth).toBe("2027-02");
  });

  test("extends the horizon to the last expense", () => {
    const f = computeForecast({ today, available: 0, expenses: [e(1, "2027-09")] });
    expect(f.months.at(-1)?.month).toBe("2027-09");
  });

  test("without balances it doesn't work out a balance", () => {
    const f = computeForecast({ today, available: null, expenses: [] });
    expect(f.summary.status).toBe("no-balances");
    expect(f.months[0].balance).toBeNull();
  });
});

describe("new cases", () => {
  test("running short takes priority over the reserve", () => {
    const s = computeForecast({ today, available: 1000, expenses: [e(1200, "2026-12")], reserve: 500 }).summary;
    expect(s.status).toBe("short");
    expect(s.alertMonth).toBe("2026-12");
  });

  test("ok gives the minimum balance", () => {
    const s = computeForecast({ today, available: 1000, expenses: [e(300, "2026-11"), e(200, "2027-01")] }).summary;
    expect(s.status).toBe("ok");
    expect(s.minBalance).toBe(500);
    expect(s.finalBalance).toBe(500);
  });

  test("only paid expenses: nothing to pay", () => {
    const s = computeForecast({ today, available: 1000, expenses: [e(300, "2026-11", "paid")] }).summary;
    expect(s.status).toBe("nothing-to-pay");
    expect(s.paidCount).toBe(1);
  });

  test("the horizon never goes beyond 36 months", () => {
    const f = computeForecast({ today, available: 10000, expenses: [e(1, "2031-01")] });
    expect(f.months).toHaveLength(36);
    expect(f.months.at(-1)?.month).toBe("2029-09");
  });

  test("rounds the cents without floating-point errors", () => {
    const f = computeForecast({ today, available: 0.3, expenses: [e(0.1, "2026-10"), e(0.2, "2026-10")] });
    expect(f.months[0].expenses).toBe(0.3);
    expect(f.months[0].balance).toBe(0);
  });

  test("the current month is the salary cycle, in Lisbon time", () => {
    const month = (iso: string) => computeForecast({ today: new Date(iso), available: 0, expenses: [] }).currentMonth;
    // 25 Oct 2026, 23:30 UTC = 23:30 in Lisbon (already winter time): last day of the October cycle
    expect(month("2026-10-25T23:30:00Z")).toBe("2026-10");
    // 26 Oct (Monday, payday): already the November cycle
    expect(month("2026-10-26T08:00:00Z")).toBe("2026-11");
    // 25 Aug 2026, 23:30 UTC = 00:30 on 26 Aug in Lisbon (summer time): September cycle
    expect(month("2026-08-25T23:30:00Z")).toBe("2026-09");
  });

  test("isOverdue only marks unpaid expenses from past months", () => {
    expect(isOverdue(e(1, "2026-09"), "2026-10")).toBe(true);
    expect(isOverdue(e(1, "2026-10"), "2026-10")).toBe(false);
    expect(isOverdue(e(1, "2026-09", "paid"), "2026-10")).toBe(false);
  });
});

describe("deed", () => {
  const ed = (amount: number, month: string, status: ForecastExpense["status"] = "planned"): ForecastExpense => ({
    amount,
    month,
    status,
    atDeed: true,
  });

  test("the forecast ends in the deed's month if there are no expenses after it", () => {
    const f = computeForecast({ today, available: 1000, expenses: [e(1, "2026-11"), e(1, "2027-06", "paid")], deedDate: "2026-12-15" });
    expect(f.months.map((m) => m.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(f.months.map((m) => m.milestones)).toEqual([[], [], ["deed"]]);
  });

  test("with an unpaid expense after the deed, the forecast runs to its month", () => {
    const f = computeForecast({ today, available: 1000, expenses: [e(1, "2027-02")], deedDate: "2026-12-15" });
    expect(f.months.map((m) => m.month)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(f.months.map((m) => m.milestones)).toEqual([[], [], ["deed"], [], []]);
    expect(f.end?.kind).toBe("deed");
  });

  test("in the deed's month, expenses with their own month count before", () => {
    const f = computeForecast({
      today,
      available: 10000,
      expenses: [e(1000, "2026-11"), e(500, "2026-12"), ed(2000, "2026-12"), ed(300, "2026-12", "paid")],
      deedDate: "2026-12-15",
    });
    expect(f.deed).toMatchObject({
      month: "2026-12",
      before: { base: 8500, optimistic: 8500, pessimistic: 8500 },
      after: { base: 6500, optimistic: 6500, pessimistic: 6500 },
      unpaid: 2000,
      unpaidCount: 1,
      paid: 300,
      paidCount: 1,
    });
    expect(f.path).toEqual({ income: 0, spending: 0, houseExpenses: 1500 });
    expect(f.summary.finalBalance).toBe(6500);
  });

  test("expenses after the deed count, with day-to-day flows continuing", () => {
    const r = (v: number) => ({ base: v, optimistic: v, pessimistic: v });
    const flows = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"].map((month) => ({ month, income: r(100), outgoings: r(0) }));
    const f = computeForecast({
      today,
      available: 5000,
      expenses: [e(1000, "2027-02"), e(500, "2027-03"), ed(2000, "2026-12")],
      deedDate: "2026-12-15",
      flows,
    });
    expect(f.beyondHorizon).toEqual({ count: 0, amount: 0 });
    expect(f.deed?.after?.base).toBe(5000 + 300 - 2000);
    expect(f.months.at(-1)).toMatchObject({ month: "2027-03", balance: 5000 + 600 - 3500 });
    expect(f.summary.finalBalance).toBe(2100);
    // The path is still only up to the deed.
    expect(f.path).toEqual({ income: 300, spending: 0, houseExpenses: 0 });
  });

  test("day-to-day flows count up to the deed, with a range, and the path adds up", () => {
    const r = (base: number, optimistic: number, pessimistic: number) => ({ base, optimistic, pessimistic });
    const flows = ["2026-10", "2026-11", "2026-12", "2027-01"].map((month) => ({
      month,
      income: r(3500, 3700, 3400),
      outgoings: r(2600, 2000, 3500),
    }));
    const f = computeForecast({ today, available: 40000, expenses: [e(10000, "2026-12"), ed(2000, "2026-12")], deedDate: "2026-12-15", flows });
    const d = f.deed!;
    expect(f.hasFlows).toBe(true);
    expect(f.path).toEqual({ income: 10500, spending: 7800, houseExpenses: 10000 });
    expect(d.before).toEqual({ base: 40000 + 10500 - 7800 - 10000, optimistic: 40000 + 3 * 1700 - 10000, pessimistic: 40000 - 3 * 100 - 10000 });
    expect(d.after?.base).toBe(d.before!.base - 2000);
  });

  test("the statement adds up: today + income − spending − expenses = balance after the deed", () => {
    const r = (v: number) => ({ base: v, optimistic: v, pessimistic: v });
    const flows = ["2026-10", "2026-11", "2026-12"].map((month) => ({ month, income: r(3500), outgoings: r(2600) }));
    const f = computeForecast({ today, available: 40000, expenses: [e(10000, "2026-12"), ed(2000, "2026-12")], deedDate: "2026-12-15", flows });
    const sum = f.months.reduce((s, m) => s + m.expectedIncome - m.expectedSpending - m.expenses, 0);
    expect(f.deed!.after!.base).toBe(40000 + sum);
  });

  test("deed already passed: normal behaviour and overdue expenses", () => {
    const f = computeForecast({ today, available: 3000, expenses: [ed(1000, "2026-08")], deedDate: "2026-08-20" });
    expect(f.deed).toBeNull();
    expect(f.months).toHaveLength(6);
    expect(f.months[0]).toMatchObject({ overdue: 1000, milestones: [] });
  });

  test("without a deed date, the result doesn't change", () => {
    const f = computeForecast({ today, available: 1000, expenses: [ed(300, "2026-12")] });
    expect(f.deed).toBeNull();
    expect(f.months.every((m) => !m.milestones.length && m.atMilestones === 0)).toBe(true);
    expect(f.months.find((m) => m.month === "2026-12")!.balance).toBe(700);
  });
});

describe("end of construction", () => {
  const ed = (amount: number, month: string): ForecastExpense => ({ amount, month, status: "planned", atDeed: true });
  const ec = (amount: number, month: string, status: ForecastExpense["status"] = "planned"): ForecastExpense => ({
    amount,
    month,
    status,
    atConstructionEnd: true,
  });

  test("construction after the deed: the forecast goes through both milestones and runs to the last expense", () => {
    const f = computeForecast({
      today,
      available: 10000,
      // the construction one has an old stored month: it always counts in the construction month
      expenses: [e(1000, "2027-01"), ed(2000, "2026-12"), ec(5000, "2026-11"), e(300, "2027-05")],
      deedDate: "2026-12-15",
      constructionEndDate: "2027-03-10",
    });
    expect(f.months.map((m) => m.month)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"]);
    expect(f.months.map((m) => m.balance)).toEqual([10000, 10000, 8000, 7000, 7000, 2000, 2000, 1700]);
    expect(f.milestones.map((m) => m.kind)).toEqual(["deed", "construction"]);
    expect(f.deed).toMatchObject({ before: { base: 10000 }, after: { base: 8000 } });
    expect(f.construction).toMatchObject({ month: "2027-03", before: { base: 7000 }, after: { base: 2000 }, unpaid: 5000, unpaidCount: 1 });
    expect(f.end?.kind).toBe("construction");
    expect(f.beyondHorizon).toEqual({ count: 0, amount: 0 });
    expect(f.path?.houseExpenses).toBe(1000);
  });

  test("construction before the deed: the deed is still the end", () => {
    const f = computeForecast({
      today,
      available: 10000,
      expenses: [ec(4000, "2026-11"), ed(2000, "2027-01")],
      deedDate: "2027-01-15",
      constructionEndDate: "2026-11-10",
    });
    expect(f.months.at(-1)?.month).toBe("2027-01");
    expect(f.end?.kind).toBe("deed");
    expect(f.construction).toMatchObject({ before: { base: 10000 }, after: { base: 6000 } });
    expect(f.summary.finalBalance).toBe(4000);
  });

  test("both in the same month follow the order of their dates", () => {
    const f = computeForecast({
      today,
      available: 10000,
      expenses: [e(500, "2026-12"), ed(2000, "2026-12"), ec(3000, "2026-12")],
      deedDate: "2026-12-20",
      constructionEndDate: "2026-12-05",
    });
    const dec = f.months.find((m) => m.month === "2026-12")!;
    expect(dec).toMatchObject({ milestones: ["construction", "deed"], expenses: 5500, atMilestones: 5000, balance: 4500 });
    expect(f.construction).toMatchObject({ before: { base: 9500 }, after: { base: 6500 } });
    expect(f.deed).toMatchObject({ before: { base: 6500 }, after: { base: 4500 } });
    expect(f.end?.kind).toBe("deed");
  });

  test("construction already passed: its expenses become overdue, like the others", () => {
    const f = computeForecast({ today, available: 3000, expenses: [ec(1000, "2026-08")], constructionEndDate: "2026-08-20" });
    expect(f.construction).toBeNull();
    expect(f.end).toBeNull();
    expect(f.months).toHaveLength(6);
    expect(f.months[0]).toMatchObject({ overdue: 1000, milestones: [] });
  });

  test("with only the construction date, the forecast ends at the construction", () => {
    const f = computeForecast({ today, available: 1000, expenses: [ec(300, "2026-12")], constructionEndDate: "2026-12-01" });
    expect(f.deed).toBeNull();
    expect(f.end?.kind).toBe("construction");
    expect(f.months.at(-1)?.month).toBe("2026-12");
    expect(f.summary.finalBalance).toBe(700);
  });

  test("a milestone after payday counts in the next cycle", () => {
    // 28 Dec 2026 is already the January cycle (the December salary arrives on the 23rd)
    const f = computeForecast({ today, available: 5000, expenses: [ed(2000, "2026-12")], deedDate: "2026-12-28" });
    expect(f.deed?.month).toBe("2027-01");
    expect(f.months.find((m) => m.month === "2026-12")!.expenses).toBe(0);
    expect(f.months.find((m) => m.month === "2027-01")!.atMilestones).toBe(2000);
  });
});
