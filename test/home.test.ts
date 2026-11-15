import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeForecast, type ForecastExpense } from "@/lib/forecast";
import { homeSummary, upcomingPayments } from "@/lib/home";

const today = new Date("2026-10-20T12:00:00Z"); // October cycle (the next one starts on the 26th)
const YEAR = 2026;
const e = (amount: number, month: string): ForecastExpense => ({ amount, month, status: "planned" });
const atDeed = (amount: number): ForecastExpense => ({ amount, month: "2026-12", status: "planned", atDeed: true });
const atConstruction = (amount: number): ForecastExpense => ({ amount, month: "2027-03", status: "planned", atConstructionEnd: true });
const dates = { deedDate: "2026-12-15", constructionEndDate: "2027-03-20" };

describe("homeSummary", () => {
  test("enough: the number is the balance after the last milestone", () => {
    const f = computeForecast({ today, available: 40000, expenses: [atDeed(12000), atConstruction(15000)], ...dates });
    expect(homeSummary(f, pt, YEAR)).toEqual({
      tone: "ok",
      title: "Chega para tudo",
      amount: 13000,
      context: "depois da obra · 20 mar 2027",
      extra: null,
    });
    expect(homeSummary(f, en, YEAR)).toMatchObject({ title: "Enough for everything", context: "after construction · 20 Mar 2027" });
  });

  test("with expenses after the last milestone, also shows the end of the forecast", () => {
    const f = computeForecast({ today, available: 40000, expenses: [atDeed(12000), e(1000, "2027-02")], deedDate: dates.deedDate });
    expect(homeSummary(f, pt, YEAR)).toMatchObject({
      amount: 28000,
      context: "depois da escritura · 15 dez",
      extra: { text: "No fim de fevereiro de 2027", amount: 27000 },
    });
  });

  test("without milestones, it is the balance at the end of the forecast", () => {
    const f = computeForecast({ today, available: 5000, expenses: [e(1000, "2026-11")] });
    expect(homeSummary(f, pt, YEAR)).toMatchObject({ title: "Chega para tudo", amount: 4000, context: "no fim de março de 2027", extra: null });
    expect(homeSummary(f, en, YEAR)).toMatchObject({ context: "at the end of March 2027" });
  });

  test("short at a milestone: the number is the balance after it, and the last one's goes below", () => {
    const flows = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"].map((month) => {
      const r = (v: number) => ({ base: v, optimistic: v, pessimistic: v });
      return { month, income: r(month > "2026-12" ? 3000 : 0), outgoings: r(0) };
    });
    const f = computeForecast({ today, available: 10000, expenses: [atDeed(12000), atConstruction(1000)], ...dates, flows });
    expect(homeSummary(f, pt, YEAR)).toEqual({
      tone: "bad",
      title: "Falta dinheiro na escritura",
      amount: -2000,
      context: "depois da escritura · 15 dez",
      extra: { text: "Depois da obra (20 mar 2027)", amount: 6000 },
    });
  });

  test("short at the last milestone: no extra line", () => {
    const f = computeForecast({ today, available: 10000, expenses: [atDeed(12000)], deedDate: dates.deedDate });
    expect(homeSummary(f, pt, YEAR)).toEqual({
      tone: "bad",
      title: "Falta dinheiro na escritura",
      amount: -2000,
      context: "depois da escritura · 15 dez",
      extra: null,
    });
  });

  test("short in a month before the milestone: the number is the balance at the end of that month", () => {
    const f = computeForecast({ today, available: 1000, expenses: [e(3000, "2026-11"), atDeed(500)], deedDate: dates.deedDate });
    expect(homeSummary(f, pt, YEAR)).toEqual({
      tone: "bad",
      title: "Falta dinheiro em novembro de 2026",
      amount: -2000,
      context: "no fim de novembro",
      extra: { text: "Depois da escritura (15 dez)", amount: -2500 },
    });
  });

  test("below the reserve: the number is the balance at that point and the extra line recalls the reserve", () => {
    const f = computeForecast({ today, available: 10000, reserve: 5000, expenses: [atDeed(7000)], deedDate: dates.deedDate });
    expect(homeSummary(f, pt, YEAR)).toEqual({
      tone: "warning",
      title: "Abaixo da reserva na escritura",
      amount: 3000,
      context: "depois da escritura · 15 dez",
      extra: { text: "Reserva mínima", amount: 5000 },
    });
  });

  test("without balances there is no number", () => {
    const f = computeForecast({ today, available: null, expenses: [e(100, "2026-11")] });
    expect(homeSummary(f, pt, YEAR)).toEqual({ tone: "neutral", title: "Sem saldos", amount: null, context: "", extra: null });
  });
});

describe("upcomingPayments", () => {
  const list = [
    { id: 1, amount: 100, month: "2026-12", status: "planned" as const },
    { id: 2, amount: 900, month: "2026-11", status: "planned" as const },
    { id: 3, amount: 50, month: "2026-09", status: "planned" as const },
    { id: 4, amount: 999, month: "2026-10", status: "paid" as const },
    { id: 5, amount: 300, month: "2026-11", status: "planned" as const },
    { id: 6, amount: 10, month: "2027-01", status: "planned" as const },
  ];

  test("overdue first, then by month and amount; paid ones are left out", () => {
    expect(upcomingPayments(list, "2026-10").map((x) => [x.id, x.overdue])).toEqual([
      [3, true],
      [2, false],
      [5, false],
      [1, false],
    ]);
    expect(upcomingPayments(list, "2026-10", 2).map((x) => x.id)).toEqual([3, 2]);
  });
});
