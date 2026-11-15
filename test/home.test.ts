import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeForecast, type ForecastExpense } from "@/lib/forecast";
import { homeSummary, milestoneCards } from "@/lib/home";

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

describe("milestoneCards", () => {
  const TODAY = "2026-10-20";

  test("each unpaid expense goes to its milestone or the first one in its month or later", () => {
    const expenses = [
      e(1000, "2026-09"), // overdue: counts from now, so before the deed
      e(2000, "2026-12"), // same month as the deed: counts before it
      atDeed(12000),
      e(500, "2027-01"),
      atConstruction(15000),
      e(300, "2027-05"), // after the last milestone: in no card
      { amount: 999, month: "2026-11", status: "paid" as const },
    ];
    const f = computeForecast({ today, available: 40000, expenses, ...dates });
    expect(milestoneCards(f, expenses, TODAY)).toEqual([
      { kind: "deed", date: "2026-12-15", daysLeft: 56, since: null, toPay: 15000, toPayCount: 3, balanceAfter: 25000, tone: "neutral" },
      {
        kind: "construction",
        date: "2027-03-20",
        daysLeft: 151,
        since: "deed",
        toPay: 15500,
        toPayCount: 2,
        balanceAfter: 9500,
        tone: "neutral",
      },
    ]);
  });

  test("the balance after is red below zero and amber below the reserve", () => {
    const short = computeForecast({ today, available: 10000, reserve: 1000, expenses: [atDeed(12000)], deedDate: dates.deedDate });
    expect(milestoneCards(short, [atDeed(12000)], TODAY)[0]).toMatchObject({ balanceAfter: -2000, tone: "negative" });
    const low = computeForecast({ today, available: 10000, reserve: 5000, expenses: [atDeed(6000)], deedDate: dates.deedDate });
    expect(milestoneCards(low, [atDeed(6000)], TODAY)[0]).toMatchObject({ balanceAfter: 4000, tone: "warning" });
  });

  test("without balances there is no balance after; without dates there are no cards", () => {
    const f = computeForecast({ today, available: null, expenses: [atDeed(100)], deedDate: dates.deedDate });
    expect(milestoneCards(f, [atDeed(100)], TODAY)[0]).toMatchObject({ toPay: 100, balanceAfter: null, tone: "neutral" });
    expect(milestoneCards(computeForecast({ today, available: 100, expenses: [e(50, "2026-11")] }), [e(50, "2026-11")], TODAY)).toEqual([]);
  });

  test("days left", () => {
    expect([0, 1, 5, -1, -3].map(pt.home.daysLeft)).toEqual(["Hoje", "Amanhã", "Faltam 5 dias", "Ontem", "Há 3 dias"]);
    expect([0, 1, 5, -3].map(en.home.daysLeft)).toEqual(["Today", "Tomorrow", "In 5 days", "3 days ago"]);
  });
});
