import { describe, expect, test } from "vitest";
import { addDays, cycleEnd } from "@/lib/cycle";
import { classify, computeTrend, median, peaksForCycle, type TrendTransaction } from "@/lib/trend";
import { parseFixedSalaries, RULES } from "@/lib/trend-rules";

const today = new Date("2026-10-21T12:00:00Z");
const SAL = RULES.salaryCategory;
const ALW = RULES.allowanceCategory;
const REF = RULES.refundCategory;
const RENT = RULES.rentCategories[0];
const HOUSE = RULES.excludedCategories[0];
// No fixed salary, to test the calculation from the transactions.
const R = { ...RULES, fixedSalaries: [], windowMonths: 6 };

const tx = (month: string, amount: number, extra: Partial<TrendTransaction> = {}): TrendTransaction => ({
  month,
  amount,
  categoryId: "groceries",
  categoryName: "Supermercados",
  categoryGroup: "food_and_drinks",
  note: "",
  isTransfer: false,
  ...extra,
});
const salary = (month: string, amount: number, note = "Salário") =>
  tx(month, amount, { categoryId: SAL, categoryName: "Salários", categoryGroup: "income", note });
const WINDOW = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];

describe("classify", () => {
  test("separates salaries, bonus, annual allowances, tax refund, rent and house", () => {
    expect(classify(salary("2026-05", 2000))).toEqual({ component: "salaries" });
    expect(classify(salary("2026-08", 1500, "Bonus"))).toEqual({ annual: "bonus" });
    expect(classify(tx("2025-12", 1779, { categoryId: ALW, categoryGroup: "income", note: "Subsidio Natal" }))).toEqual({ annual: "allowance" });
    expect(classify(tx("2026-07", 2000, { categoryId: ALW, categoryGroup: "income", note: "Subsidio Férias" }))).toEqual({ annual: "allowance" });
    // The meal allowance is monthly.
    expect(classify(tx("2026-07", 200, { categoryId: ALW, categoryGroup: "income", note: "Subsídio Alimentação Junho" }))).toEqual({
      component: "otherIncome",
    });
    expect(classify(tx("2026-06", 554, { categoryId: REF, categoryGroup: "income", note: "Reembolso IRS" }))).toEqual({ annual: "taxRefund" });
    expect(classify(tx("2026-06", 16, { categoryId: REF, categoryGroup: "income", note: "Juros" }))).toEqual({ component: "otherIncome" });
    expect(classify(tx("2026-05", -320, { categoryId: RENT }))).toEqual({ component: "rent" });
    expect(classify(tx("2025-10", -15700, { categoryId: HOUSE }))).toBeNull();
    expect(classify(tx("2025-10", -50, { categoryId: "x", parentCategoryId: HOUSE }))).toBeNull();
    expect(classify(tx("2026-05", -400, { isTransfer: true }))).toBeNull();
  });
});

describe("computeTrend", () => {
  const salaries = [3436, 4512, 4392, 3920, 3521, 3536];
  const spending = [2506, 2914, 2041, 3556, 3973, 1434];
  const base = [
    ...WINDOW.map((m, i) => salary(m, salaries[i])),
    ...WINDOW.map((m, i) => tx(m, -spending[i])),
    ...WINDOW.map((m) => tx(m, -320, { categoryId: RENT, categoryName: "Renda v2" })),
  ];

  test("salaries: a normal month is the 2nd lowest; spending by the cycles' median", () => {
    const t = computeTrend({ rules: R, transactions: base, today });
    expect(t.window).toEqual({ from: "2026-04", to: "2026-09" });
    const s = t.components.find((c) => c.id === "salaries")!;
    expect(s.value).toEqual({ base: 3521, optimistic: median(salaries), pessimistic: 3436 });
    expect(s.rule).toEqual({ kind: "secondLowest", months: 6 });
    const g = t.components.find((c) => c.id === "spending")!;
    expect(g.value.base).toBe(median(spending));
    expect(g.rule).toEqual({ kind: "usual", months: 6 });
    expect(g.values.map((v) => v.amount)).toEqual(spending);
    expect(t.monthlyNet.base).toBe(3521 - median(spending) - 320);
    expect(t.peaks).toEqual([]);
    expect(t.warnings).toEqual([]);
  });

  test("peaks only warn: they don't change the forecast", () => {
    const cat = (name: string) => ({ categoryId: name, categoryName: name });
    const transactions = [
      ...WINDOW.map((m) => tx(m, -400, cat("Supermercados"))),
      tx("2026-05", -581, cat("Seguros")), // peak
      tx("2026-06", -130, cat("Supermercados")), // 530 in June: not a peak (less than double)
      salary("2026-09", 3000),
    ];
    const t = computeTrend({ rules: R, transactions, today });
    expect(t.peaks).toEqual([{ name: "Seguros", sourceMonth: "2026-05", total: 581, usual: 0 }]);
    expect(peaksForCycle(t.peaks, "2027-05").map((x) => x.name)).toEqual(["Seguros"]);
    expect(peaksForCycle(t.peaks, "2026-11")).toEqual([]);
    const flow = (month: string) => t.flows.find((f) => f.month === month)!.outgoings.base;
    expect(flow("2026-11")).toBe(400);
    expect(flow("2027-05")).toBe(400);
  });

  test("the overridden amount replaces the cycle's spending and rent (in the current cycle, what is left)", () => {
    const spendingOverrides = new Map([
      ["2026-10", 100],
      ["2026-12", 3500],
    ]);
    const t = computeTrend({ rules: R, transactions: base, today, spendingOverrides });
    const g = (month: string) => t.spendingByCycle.find((x) => x.month === month)!;
    expect(g("2026-12")).toEqual({ month: "2026-12", automatic: median(spending) + 320, override: 3500 });
    expect(g("2026-10").automatic).toBe(320); // no final spending in the test cycles; rent still to pay
    expect(g("2026-11").override).toBeNull();
    const flow = (month: string) => t.flows.find((f) => f.month === month)!.outgoings.base;
    expect(flow("2026-10")).toBe(100);
    expect(flow("2026-11")).toBe(median(spending) + 320);
    expect(flow("2026-12")).toBe(3500);
  });

  test("in the current cycle, warns about last year's spending that hasn't happened yet", () => {
    const cat = (name: string) => ({ categoryId: name, categoryName: name });
    const t = computeTrend({
      rules: { ...R, windowMonths: 12 },
      today,
      transactions: [tx("2025-10", -581, cat("Seguros")), tx("2025-10", -300, cat("Prendas")), tx("2026-10", -290, cat("Seguros"))],
    });
    expect(t.currentCycle.spentByCategory).toEqual({ Seguros: 290 });
    expect(peaksForCycle(t.peaks, "2026-10").map((x) => x.name)).toEqual(["Seguros", "Prendas"]);
  });

  test("with a fixed salary, salaries are always the sum of the parts", () => {
    const fixed = [
      { name: "Ana", amount: 1500.5 },
      { name: "Rui", amount: 1200 },
      { name: "Extra", amount: 100 },
    ];
    const t = computeTrend({ rules: { ...RULES, fixedSalaries: fixed }, transactions: base, today });
    const s = t.components.find((c) => c.id === "salaries")!;
    expect(s.value).toEqual({ base: 2800.5, optimistic: 2800.5, pessimistic: 2800.5 });
    expect(s.rule).toEqual({ kind: "fixed", salaries: fixed });
    expect(t.flows[1].income.base).toBe(2800.5);
  });

  test("FIXED_SALARIES: Name:amount, comma-separated; empty or invalid uses the transactions", () => {
    expect(parseFixedSalaries("Ana:1500.50, Rui:1200")).toEqual([
      { name: "Ana", amount: 1500.5 },
      { name: "Rui", amount: 1200 },
    ]);
    expect(parseFixedSalaries("")).toEqual([]);
    expect(parseFixedSalaries(undefined)).toEqual([]);
    const error = console.error;
    console.error = () => {};
    expect(parseFixedSalaries("Ana:abc,Rui:1200")).toEqual([]);
    console.error = error;
  });

  // Spending in the last days of each window cycle (Apr to Sep).
  const atEnd = (month: string, amount: number, daysBefore = 0) =>
    tx(month, -amount, { date: new Date(`${addDays(cycleEnd(month), -daysBefore)}T12:00:00Z`) });
  const final = [atEnd("2026-04", 100), atEnd("2026-06", 50, 2), atEnd("2026-07", 200, 4), atEnd("2026-09", 30)];

  test("in the current cycle, the spending left comes from the same last days of the previous cycles", () => {
    const t = computeTrend({
      rules: R,
      today, // 21 Oct: the October cycle ends on the 25th, 5 days left
      transactions: [
        ...base,
        ...final,
        atEnd("2026-05", 500, 5), // 6th day before the end: out
        // Recorded on 2 July but with the real date in the note (26 June, start of the cycle): out
        tx("2026-07", -999, { date: new Date("2026-07-02T12:00:00Z"), note: "26/6 - Jantar" }),
        salary("2026-10", 3900),
        tx("2026-10", -1000),
      ],
    });
    expect(t.currentCycle).toMatchObject({ month: "2026-10", start: "2026-09-25", end: "2026-10-25", daysLeft: 5 });
    expect(t.currentCycle.byCycle.map((c) => c.amount)).toEqual([100, 0, 50, 200, 0, 30]);
    expect(t.currentCycle.spendingLeft).toBe(40);
    const oct = t.flows[0];
    expect(oct.income.base).toBe(0); // the cycle's salary is already in
    expect(oct.outgoings.base).toBe(40 + 320); // rent hasn't been paid yet
    expect(t.flows[1].income.base).toBe(3521);
  });

  test("on the last day of the cycle only that day counts", () => {
    const t = computeTrend({
      rules: R,
      today: new Date("2026-10-25T10:00:00Z"),
      transactions: [...base, ...final, tx("2026-10", -320, { categoryId: RENT })],
    });
    expect(t.currentCycle.daysLeft).toBe(1);
    expect(t.currentCycle.byCycle.map((c) => c.amount)).toEqual([100, 0, 0, 0, 0, 30]);
    expect(t.flows[0].outgoings.base).toBe(0);
  });

  test("from payday on, the whole next cycle counts", () => {
    const t = computeTrend({ rules: R, transactions: base, today: new Date("2026-10-26T08:00:00Z") });
    expect(t.currentMonth).toBe("2026-11");
    expect(t.window).toEqual({ from: "2026-05", to: "2026-10" });
    expect(t.currentCycle.spendingLeft).toBe(t.components.find((c) => c.id === "spending")!.value.base);
  });

  test("annual income repeats in the same month; bonus and tax refund are zero in the pessimistic case", () => {
    const t = computeTrend({
      rules: R,
      today,
      transactions: [
        ...base,
        tx("2025-12", 3101.8, { categoryId: ALW, categoryGroup: "income", note: "Subsídio Natal" }),
        salary("2026-08", 1500, "Bonus"),
        tx("2026-06", 1200.47, { categoryId: REF, categoryGroup: "income", note: "Reembolso IRS" }),
      ],
    });
    expect(t.annual.map((a) => [a.name, a.sourceMonth, a.amount, a.pessimistic])).toEqual([
      ["christmasAllowance", "2025-12", 3101.8, 3101.8],
      ["taxRefund", "2026-06", 1200.47, 0],
      ["bonus", "2026-08", 1500, 0],
    ]);
    const dec = t.flows.find((f) => f.month === "2026-12")!;
    expect(dec.income).toEqual({ base: 3521 + 3101.8, optimistic: median(salaries) + 3101.8, pessimistic: 3436 + 3101.8 });
    const aug = t.flows.find((f) => f.month === "2027-08")!;
    expect(aug.income.base).toBe(3521 + 1500);
    expect(aug.income.pessimistic).toBe(3436);
  });

  test("ignores transfers and house expenses; a month without transactions counts zero", () => {
    const t = computeTrend({
      rules: R,
      today,
      transactions: [salary("2026-09", 3000), tx("2026-09", -15700, { categoryId: HOUSE }), tx("2026-08", -500, { isTransfer: true })],
    });
    expect(t.components.map((c) => c.id)).toEqual(["salaries"]);
    expect(t.components[0].values.map((v) => v.amount)).toEqual([0, 0, 0, 0, 0, 3000]);
    expect(t.warnings[0]).toEqual({ code: "fewMonths", months: 1, window: 6 });
  });

  test("without transactions there are no flows (the forecast stays as before)", () => {
    const t = computeTrend({ rules: R, transactions: [], today });
    expect(t.flows).toEqual([]);
    expect(t.warnings[0]).toEqual({ code: "noTransactions" });
  });
});
