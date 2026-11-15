// Dates of the deed signing and of the end of construction: validation and helpers. Dates are
// "YYYY-MM-DD" strings and never go through new Date("YYYY-MM-DD"), which would read them in UTC
// and could shift the day.
import { cycleOfDay } from "./cycle";
import type { Month } from "./months";

/** Dates on which marked expenses are paid: the deed signing and the end of construction. */
export const MILESTONES = ["deed", "construction"] as const;
export type Milestone = (typeof MILESTONES)[number];

/** Dates stored in the settings (YYYY-MM-DD or null). */
export interface MilestoneDates {
  deedDate: string | null;
  constructionEndDate: string | null;
}

/** Date of the milestone, from the stored dates. */
export function milestoneDate(kind: Milestone, dates: MilestoneDates): string | null {
  return kind === "deed" ? dates.deedDate : dates.constructionEndDate;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(v: string): boolean {
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const [y, mm, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2020 || y > 2100 || mm < 1 || mm > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, mm, 0)).getUTCDate();
  return d <= daysInMonth;
}

/** Salary cycle the date falls in (from payday on, it is already the next cycle). */
export function monthOfDate(date: string): Month {
  return cycleOfDay(date);
}

/** Empty clears the date (null). */
export function parseMilestoneDate(input: unknown): { ok: true; date: string | null } | { ok: false } {
  const date = String(input ?? "").trim();
  if (!date) return { ok: true, date: null };
  if (!isValidDate(date)) return { ok: false };
  return { ok: true, date };
}
