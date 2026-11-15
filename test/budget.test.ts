import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { computeBudget } from "@/lib/budget";
import { parseRoomId, validateBudget, validateExpense, validateRoomName, validateRooms } from "@/lib/validation";

const rooms = [
  { id: 1, name: "Geral", budget: 1000 },
  { id: 2, name: "Sala", budget: 500 },
  { id: 3, name: "Garagem", budget: null },
];

describe("computeBudget", () => {
  test("adds paid and unpaid by room and works out the overall budget", () => {
    const b = computeBudget(rooms, [
      { amount: 300, status: "paid", roomId: 1 },
      { amount: 200.1, status: "planned", roomId: 1 },
      { amount: 600, status: "planned", roomId: 2 },
      { amount: 50, status: "paid", roomId: 3 },
      { amount: 999, status: "planned", roomId: null },
    ]);
    expect(b.rooms.map((r) => [r.name, r.paid, r.unpaid, r.total, r.remaining, r.expenseCount])).toEqual([
      ["Geral", 300, 200.1, 500.1, 499.9, 2],
      ["Sala", 0, 600, 600, -100, 1],
      ["Garagem", 50, 0, 50, null, 1],
    ]);
    expect(b.unassigned).toEqual({ paid: 0, unpaid: 999, total: 999, expenseCount: 1 });
    // No room stays out; the Garage (no budget) counts in the spending.
    expect(b.overall).toEqual({ budget: 1500, paid: 350, unpaid: 800.1, total: 1150.1, remaining: 349.9, overCount: 1 });
  });

  test("an expense of a room that no longer exists counts as no room", () => {
    const b = computeBudget(rooms, [{ amount: 10, status: "paid", roomId: 99 }]);
    expect(b.unassigned.total).toBe(10);
    expect(b.overall.total).toBe(0);
  });

  test("no rooms and no expenses", () => {
    const b = computeBudget([], []);
    expect(b.rooms).toEqual([]);
    expect(b.overall).toEqual({ budget: 0, paid: 0, unpaid: 0, total: 0, remaining: 0, overCount: 0 });
  });
});

describe("room of the expense", () => {
  test.each([
    ["3", 3],
    [" 12 ", 12],
    ["none", null],
    ["", null],
    ["0", null],
    ["-1", null],
    ["1.5", null],
    [undefined, null],
  ])("parseRoomId(%s) = %s", (input, expected) => {
    expect(parseRoomId(input)).toBe(expected);
  });

  test("validateExpense keeps the chosen room", () => {
    const r = validateExpense({ description: "Sofá", amount: "800", month: "2026-12", room: "4" }, {}, pt);
    expect(r.ok && r.expense.roomId).toBe(4);
  });
});

describe("room validation", () => {
  test("name: trims spaces, refuses empty, too long and the no-room label in either language", () => {
    expect(validateRoomName("  Casa   de banho ", pt)).toEqual({ ok: true, name: "Casa de banho" });
    expect(validateRoomName("", pt).ok).toBe(false);
    expect(validateRoomName("x".repeat(41), pt).ok).toBe(false);
    expect(validateRoomName("sem divisao", pt)).toEqual({ ok: false, error: "«Sem divisão» é um nome reservado." });
    expect(validateRoomName("No room", pt).ok).toBe(false);
    expect(validateRoomName("Não aplicável", pt).ok).toBe(true);
  });

  test("limit: empty = no limit", () => {
    expect(validateBudget("", pt)).toEqual({ ok: true, amount: null });
    expect(validateBudget("2 500,50", pt)).toEqual({ ok: true, amount: 2500.5 });
    expect(validateBudget("0", pt)).toEqual({ ok: true, amount: 0 });
    expect(validateBudget("-5", pt).ok).toBe(false);
    expect(validateBudget("abc", pt).ok).toBe(false);
  });

  test("form with every room", () => {
    const r = validateRooms(
      [
        ["name:1", "Geral"],
        ["budget:1", "1000"],
        ["name:2", "Sala"],
        ["budget:2", ""],
        ["$ACTION_ID", "x"],
      ],
      pt,
    );
    expect(r).toEqual({
      ok: true,
      rooms: [
        { id: 1, name: "Geral", budget: 1000 },
        { id: 2, name: "Sala", budget: null },
      ],
    });
  });

  test("refuses repeated names regardless of case and accents", () => {
    const r = validateRooms(
      [
        ["name:1", "Sala"],
        ["name:2", "sála"],
      ],
      pt,
    );
    expect(r.ok).toBe(false);
  });

  test("refuses an invalid limit, naming the room, in the chosen language", () => {
    const entries: [string, string][] = [
      ["name:1", "Sala"],
      ["budget:1", "muito"],
    ];
    expect(validateRooms(entries, pt)).toEqual({ ok: false, error: "Sala: O limite tem de ser um número igual ou maior que zero." });
    expect(validateRooms(entries, en)).toEqual({ ok: false, error: "Sala: The limit must be a number equal to or greater than zero." });
  });
});
