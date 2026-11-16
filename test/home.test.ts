import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeForecast, type ForecastExpense } from "@/lib/forecast";
import { milestoneCards } from "@/lib/home";

const today = new Date("2026-10-20T12:00:00Z"); // October cycle (the next one starts on the 26th)
const e = (amount: number, month: string): ForecastExpense => ({ amount, month, status: "planned" });
const atDeed = (amount: number): ForecastExpense => ({ amount, month: "2026-12", status: "planned", atDeed: true });
const atConstruction = (amount: number): ForecastExpense => ({ amount, month: "2027-03", status: "planned", atConstructionEnd: true });
const dates = { deedDate: "2026-12-15", constructionEndDate: "2027-03-20" };

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
