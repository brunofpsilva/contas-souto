// Validation of the data that comes from the forms. Error messages come in the language of `t`.
import { LOCALES, messagesFor, type Messages } from "@/i18n/config";
import { CATEGORIES, DESCRIPTION_MAX, NOTE_MAX, ROOM_NAME_MAX, type Category, type Status } from "./domain";
import { monthYear } from "./format";
import { monthOfDate } from "./milestones";
import { isValidMonth } from "./months";

/**
 * Reads a euro amount written the Portuguese or the English way:
 * "1 234,56", "1.234,56", "1234.56", "1234,5", "1 234 €". Returns null if it isn't a number.
 */
export function parseAmount(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) / 100 : null;
  if (typeof input !== "string") return null;
  let s = input.replace(/[\s  €]/g, "");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // The last separator is the decimal one.
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "1.234" = one thousand two hundred and thirty-four
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export interface ExpenseData {
  description: string;
  amount: number;
  month: string;
  category: Category;
  status: Status;
  note: string;
  atDeed: boolean;
  atConstructionEnd: boolean;
  /** null = no room. The action checks that the room exists. */
  roomId: number | null;
}

export type ExpenseErrors = Partial<Record<keyof ExpenseData, string>>;

/**
 * `deedDate` and `constructionEndDate` (YYYY-MM-DD) are the dates stored in the settings: an
 * expense "at the deed" or "at the end of construction" gets that date's month. Without the
 * date set, that milestone can't be chosen.
 */
export function validateExpense(
  input: Record<string, unknown>,
  { deedDate = null, constructionEndDate = null }: { deedDate?: string | null; constructionEndDate?: string | null },
  t: Messages,
): { ok: true; expense: ExpenseData } | { ok: false; errors: ExpenseErrors } {
  const v = t.validation;
  const errors: ExpenseErrors = {};
  const description = String(input.description ?? "").trim();
  const amount = parseAmount(input.amount);
  const atDeed = input.when === "deed";
  const atConstructionEnd = input.when === "construction";
  const milestoneDate = atDeed ? deedDate : atConstructionEnd ? constructionEndDate : null;
  const month = milestoneDate ? monthOfDate(milestoneDate) : String(input.month ?? "").trim();
  const category = CATEGORIES.find((c) => c === input.category) ?? "other";
  const status: Status = input.status === "paid" ? "paid" : "planned";
  const note = String(input.note ?? "").trim();
  const roomId = parseRoomId(input.room);

  if (!description) errors.description = v.descriptionRequired;
  else if (description.length > DESCRIPTION_MAX) errors.description = v.descriptionTooLong(DESCRIPTION_MAX);
  if (amount == null) errors.amount = v.amountNotNumber;
  else if (amount < 0) errors.amount = v.amountNegative;
  else if (amount >= 1e10) errors.amount = v.amountTooLarge;
  if (atDeed && !deedDate) errors.month = t.milestones.deed.missingDate;
  else if (atConstructionEnd && !constructionEndDate) errors.month = t.milestones.construction.missingDate;
  else if (!isValidMonth(month)) errors.month = v.monthRequired;
  if (note.length > NOTE_MAX) errors.note = v.noteTooLong(NOTE_MAX);

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, expense: { description, amount: amount!, month, category, status, note, atDeed, atConstructionEnd, roomId } };
}

/** Id of the room chosen in the form; anything else ("none", empty) means no room. */
export function parseRoomId(input: unknown): number | null {
  const s = String(input ?? "").trim();
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

/** For comparing names regardless of case and accents ("Sem divisão" = "sem divisao"). */
export function nameKey(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** The "no room" label in any language can't be a room's name. */
const RESERVED = new Map(LOCALES.map((l) => [nameKey(messagesFor(l).budget.noRoom), messagesFor(l).budget.noRoom]));

/** A room's name: required, up to ROOM_NAME_MAX, and not the "no room" label. */
export function validateRoomName(input: unknown, t: Messages): { ok: true; name: string } | { ok: false; error: string } {
  const name = String(input ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: t.validation.nameRequired };
  if (name.length > ROOM_NAME_MAX) return { ok: false, error: t.validation.nameTooLong(ROOM_NAME_MAX) };
  const reserved = RESERVED.get(nameKey(name));
  if (reserved) return { ok: false, error: t.validation.nameReserved(reserved) };
  return { ok: true, name };
}

/** A room's limit; empty = no limit (null). */
export function validateBudget(input: unknown, t: Messages): { ok: true; amount: number | null } | { ok: false; error: string } {
  if (input == null || (typeof input === "string" && !input.trim())) return { ok: true, amount: null };
  const v = parseAmount(input);
  if (v == null || v < 0) return { ok: false, error: t.validation.limitInvalid };
  if (v >= 1e10) return { ok: false, error: t.validation.limitTooLarge };
  return { ok: true, amount: v };
}

/**
 * Form with every room: fields "name:ID" and "budget:ID". Refuses repeated names (regardless
 * of case and accents).
 */
export function validateRooms(
  entries: Iterable<[string, unknown]>,
  t: Messages,
): { ok: true; rooms: { id: number; name: string; budget: number | null }[] } | { ok: false; error: string } {
  const fields = new Map<number, { name?: unknown; budget?: unknown }>();
  for (const [key, value] of entries) {
    const m = /^(name|budget):(\d{1,9})$/.exec(key);
    if (!m) continue;
    const id = Number(m[2]);
    const f = fields.get(id) ?? {};
    f[m[1] as "name" | "budget"] = value;
    fields.set(id, f);
  }
  const rooms: { id: number; name: string; budget: number | null }[] = [];
  const seen = new Set<string>();
  for (const [id, f] of fields) {
    const name = validateRoomName(f.name, t);
    if (!name.ok) return name;
    const budget = validateBudget(f.budget, t);
    if (!budget.ok) return { ok: false, error: `${name.name}: ${budget.error}` };
    const k = nameKey(name.name);
    if (seen.has(k)) return { ok: false, error: t.validation.duplicateRoom(name.name) };
    seen.add(k);
    rooms.push({ id, name: name.name, budget: budget.amount });
  }
  return { ok: true, rooms };
}

export function validateReserve(input: unknown, t: Messages): { ok: true; amount: number } | { ok: false; error: string } {
  if (input == null || (typeof input === "string" && !input.trim())) return { ok: true, amount: 0 };
  const v = parseAmount(input);
  if (v == null || v < 0) return { ok: false, error: t.validation.reserveInvalid };
  if (v >= 1e10) return { ok: false, error: t.validation.reserveTooLarge };
  return { ok: true, amount: v };
}

/**
 * Monthly spending adjusted by hand: fields "spending:YYYY-MM". Empty = back to the automatic
 * amount (goes in `remove`).
 */
export function validateSpendingOverrides(
  entries: Iterable<[string, unknown]>,
  t: Messages,
): { ok: true; save: { month: string; amount: number }[]; remove: string[] } | { ok: false; error: string } {
  const save: { month: string; amount: number }[] = [];
  const remove: string[] = [];
  for (const [key, input] of entries) {
    if (!key.startsWith("spending:")) continue;
    const month = key.slice("spending:".length);
    if (!isValidMonth(month)) return { ok: false, error: t.validation.invalidMonth };
    if (input == null || (typeof input === "string" && !input.trim())) {
      remove.push(month);
      continue;
    }
    const v = parseAmount(input);
    if (v == null || v < 0) return { ok: false, error: t.validation.spendingInvalid(monthYear(t, month)) };
    if (v >= 1e9) return { ok: false, error: t.validation.spendingTooLarge(monthYear(t, month)) };
    save.push({ month, amount: v });
  }
  return { ok: true, save, remove };
}
