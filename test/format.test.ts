import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeForecast } from "@/lib/forecast";
import { axisMonth, capitalize, formatDateTime, formatEuros, longMonth, monthYear, statusText } from "@/lib/format";
import { addMonths, isValidMonth } from "@/lib/months";

// Intl separators are non-breaking spaces; normalise them to compare.
const n = (s: string) => s.replace(/[  ]/g, " ");

describe("formatEuros", () => {
  test("groups thousands even with 4 digits", () => {
    expect(n(formatEuros(pt, 1234.56))).toBe("1 234,56 €");
    expect(n(formatEuros(pt, 40001))).toBe("40 001,00 €");
    expect(n(formatEuros(pt, 5000.4, { whole: true }))).toBe("5 000 €");
  });
  test("a single minus sign (U+2212), and plus only when asked", () => {
    expect(n(formatEuros(pt, -500))).toBe("−500,00 €");
    expect(n(formatEuros(pt, -2500.4, { whole: true, sign: true }))).toBe("−2 500 €");
    expect(n(formatEuros(pt, 3900, { whole: true, sign: true }))).toBe("+3 900 €");
    expect(n(formatEuros(pt, 3900, { whole: true }))).toBe("3 900 €");
    // An amount that rounds to zero has no sign.
    expect(n(formatEuros(pt, -0.2, { whole: true, sign: true }))).toBe("0 €");
  });
  test("without a value shows a dash", () => {
    expect(formatEuros(pt, null)).toBe("—");
  });
  test("in English, the euro goes first", () => {
    expect(formatEuros(en, 1234.56)).toBe("€1,234.56");
    expect(formatEuros(en, -2500.4, { whole: true })).toBe("−€2,500");
  });
});

describe("months", () => {
  test("adds months and crosses the year", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
  });
  test("validates YYYY-MM", () => {
    expect(isValidMonth("2026-12")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("11/2026")).toBe(false);
  });
  test("names in both languages", () => {
    expect(monthYear(pt, "2027-03")).toBe("março de 2027");
    expect(monthYear(en, "2027-03")).toBe("March 2027");
    expect(axisMonth(pt, "2026-12")).toBe("dez");
    expect(axisMonth(pt, "2027-01")).toBe("jan 27");
    expect(axisMonth(en, "2027-01")).toBe("Jan 27");
  });
  test("the long month only has the year when it isn't the current one", () => {
    expect(longMonth(pt, "2026-12", 2026)).toBe("dezembro");
    expect(longMonth(pt, "2027-01", 2026)).toBe("janeiro de 2027");
    expect(longMonth(en, "2027-01", 2026)).toBe("January 2027");
  });
});

describe("texts", () => {
  test("date and time, in Lisbon time", () => {
    expect(formatDateTime(pt, new Date("2026-11-10T09:14:00Z"))).toBe("10 nov, 09:14");
    // In summer, Lisbon is one hour ahead of UTC.
    expect(formatDateTime(pt, "2026-07-01T23:30:00Z")).toBe("2 jul, 00:30");
    expect(formatDateTime(en, "2026-07-01T23:30:00Z")).toBe("2 Jul, 00:30");
    expect(formatDateTime(pt, null)).toBe("—");
  });
  test("capital first letter and counts", () => {
    expect(capitalize("dezembro de 2026")).toBe("Dezembro de 2026");
    expect(pt.expenseCount(1)).toBe("1 despesa");
    expect(pt.expenseCount(3)).toBe("3 despesas");
    expect(en.expenseCount(3)).toBe("3 expenses");
    expect(pt.budget.roomsOver(2)).toBe("2 divisões acima do limite");
  });
});

describe("statusText", () => {
  const today = new Date("2026-10-20T12:00:00Z");
  test("the sentence of each status", () => {
    const exp = [{ amount: 800, month: "2026-12", status: "planned" as const }];
    expect(statusText(pt, computeForecast({ today, available: 500, expenses: exp }).summary).text).toBe("Falta dinheiro em dezembro de 2026");
    expect(statusText(en, computeForecast({ today, available: 500, expenses: exp }).summary).text).toBe("Not enough money in December 2026");
    expect(statusText(pt, computeForecast({ today, available: 1000, expenses: exp, reserve: 500 }).summary).text).toBe(
      "Abaixo da reserva em dezembro de 2026",
    );
    expect(statusText(pt, computeForecast({ today, available: 2000, expenses: exp }).summary).text).toBe("Chega para tudo");
    expect(statusText(pt, computeForecast({ today, available: 2000, expenses: [] }).summary).text).toBe("Nada por pagar");
    expect(statusText(pt, computeForecast({ today, available: null, expenses: exp }).summary).text).toBe("Sem saldos");
  });

  test("says at which milestone the money runs short", () => {
    const exp = [
      { amount: 500, month: "2026-12", status: "planned" as const, atDeed: true },
      { amount: 800, month: "2026-12", status: "planned" as const, atConstructionEnd: true },
    ];
    const dates = { deedDate: "2026-12-05", constructionEndDate: "2026-12-20" };
    const f = computeForecast({ today, available: 1000, expenses: exp, ...dates });
    expect(statusText(pt, f.summary, f).text).toBe("Falta dinheiro no fim da obra");
    expect(statusText(en, f.summary, f).text).toBe("Not enough money at the end of construction");
    // If it was already short before the milestones, it says the month.
    const g = computeForecast({ today, available: 1000, expenses: [...exp, { amount: 2000, month: "2026-12", status: "planned" }], ...dates });
    expect(statusText(pt, g.summary, g).text).toBe("Falta dinheiro em dezembro de 2026");
  });
});
