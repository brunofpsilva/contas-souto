import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeAvailable, markIncluded } from "@/lib/accounts";
import { parseAmount, validateExpense, validateReserve, validateSpendingOverrides } from "@/lib/validation";

describe("parseAmount", () => {
  test.each([
    ["1234,56", 1234.56],
    ["1 234,56", 1234.56],
    ["1 234,56 €", 1234.56],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["1234.56", 1234.56],
    ["1.234", 1234],
    ["12.5", 12.5],
    ["0,1", 0.1],
    ["800", 800],
    [1200.555, 1200.56],
  ])("%s -> %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  test.each(["", "abc", "1,2,3", "12a", "--1"])("invalid: %s", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("validateExpense (rules from the old version)", () => {
  test("refuses an empty description, a negative amount and a badly formatted month", () => {
    const r = validateExpense({ description: "", amount: "-1", month: "11/2026" }, {}, pt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["amount", "description", "month"]);
  });

  test("normalises unknown category and status", () => {
    const r = validateExpense({ description: " Sofá ", amount: "1 200,5", month: "2026-12", category: "?", status: "?" }, {}, pt);
    expect(r).toEqual({
      ok: true,
      expense: {
        description: "Sofá",
        amount: 1200.5,
        month: "2026-12",
        category: "other",
        status: "planned",
        note: "",
        atDeed: false,
        atConstructionEnd: false,
        roomId: null,
      },
    });
  });

  test("accepts valid values", () => {
    const r = validateExpense({ description: "Frigorífico", amount: "899", month: "2027-01", category: "appliances", status: "paid" }, {}, pt);
    expect(r.ok && r.expense).toMatchObject({ category: "appliances", status: "paid" });
  });

  test("refuses texts that are too long", () => {
    const r = validateExpense({ description: "x".repeat(121), amount: "1", month: "2026-12", note: "y".repeat(201) }, {}, pt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["description", "note"]);
  });

  test("the errors come in the chosen language", () => {
    const r = validateExpense({ description: "", amount: "1", month: "2026-12" }, {}, en);
    expect(!r.ok && r.errors.description).toBe("The description is required.");
  });
});

describe("validateExpense at the deed", () => {
  test("gets the deed date's month, ignoring the month typed", () => {
    const r = validateExpense({ description: "IMT", amount: "5000", when: "deed", month: "2026-11" }, { deedDate: "2027-01-15" }, pt);
    expect(r.ok && r.expense).toMatchObject({ month: "2027-01", atDeed: true });
  });

  test("without a deed date the deed can't be chosen", () => {
    const r = validateExpense({ description: "IMT", amount: "5000", when: "deed", month: "2026-11" }, {}, pt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.month).toMatch(/data da escritura/);
  });
});

describe("reserve", () => {
  test("empty is zero; negative is refused", () => {
    expect(validateReserve("", pt)).toEqual({ ok: true, amount: 0 });
    expect(validateReserve("5 000", pt)).toEqual({ ok: true, amount: 5000 });
    expect(validateReserve("-1", pt).ok).toBe(false);
  });
});

describe("accounts that count", () => {
  const accounts = [
    { id: "a1", balance: 25000.39 },
    { id: "a2", balance: 15000.61 },
    { id: "a4", balance: 0 },
    { id: "c1", balance: -250 },
  ];

  test("by default the ones with a positive balance count (case from the old version: 40 224 €)", () => {
    const m = markIncluded(accounts, null);
    expect(m.filter((a) => a.included).map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(computeAvailable(m)).toBe(40001);
  });

  test("with a selection, only the selected ones count", () => {
    expect(computeAvailable(markIncluded(accounts, ["a1"]))).toBe(25000.39);
    expect(computeAvailable(markIncluded(accounts, []))).toBe(0);
  });

  test("without synced accounts, the available balance is unknown", () => {
    expect(computeAvailable(markIncluded([], null))).toBeNull();
  });
});

describe("spending overrides", () => {
  test("reads the fields by cycle; empty goes back to automatic", () => {
    const r = validateSpendingOverrides(
      [
        ["spending:2026-11", "2 500"],
        ["spending:2026-12", ""],
        ["other", "x"],
      ],
      pt,
    );
    expect(r).toEqual({ ok: true, save: [{ month: "2026-11", amount: 2500 }], remove: ["2026-12"] });
  });

  test("refuses invalid months and amounts", () => {
    expect(validateSpendingOverrides([["spending:2026-13", "1"]], pt).ok).toBe(false);
    expect(validateSpendingOverrides([["spending:2026-11", "-5"]], pt).ok).toBe(false);
    expect(validateSpendingOverrides([["spending:2026-11", "abc"]], pt)).toEqual({
      ok: false,
      error: "O valor de novembro de 2026 tem de ser um número igual ou maior que zero.",
    });
  });
});

describe("validateExpense at the end of construction", () => {
  test("gets the construction date's cycle and isn't at the deed", () => {
    const r = validateExpense(
      { description: "Empreiteiro", amount: "15000", when: "construction", month: "2026-11" },
      { deedDate: "2026-12-15", constructionEndDate: "2027-03-10" },
      pt,
    );
    expect(r.ok && r.expense).toMatchObject({ month: "2027-03", atConstructionEnd: true, atDeed: false });
  });

  test("without a construction date it can't be chosen", () => {
    const r = validateExpense({ description: "Empreiteiro", amount: "1", when: "construction", month: "2026-11" }, { deedDate: "2026-12-15" }, pt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.month).toMatch(/fim da obra/);
  });

  test("a date after payday falls in the next cycle", () => {
    const r = validateExpense({ description: "IMT", amount: "1", when: "deed", month: "" }, { deedDate: "2026-12-28" }, pt);
    expect(r.ok && r.expense.month).toBe("2027-01");
  });
});
