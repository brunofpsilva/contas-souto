// Budget cycles: each "month" starts on payday and ends the day before the next one.
// Wallet doesn't let us change when a month starts, so transactions from the last days are
// dated on the 1st of the following month, with the real date written in the note ("26/9 - ...").
// That way a transaction's month in Wallet already is the cycle; the real date is only used to
// know on which day of the cycle the money was spent.
//
// The salary arrives on the 26th, or on the previous working day if that is a weekend; the
// December salary (which opens the January cycle) arrives on the 23rd. Dates are always "YYYY-MM-DD" strings.

import { addMonths, dayOf, type Month } from "./months";

const PAYDAY = 26;
const DECEMBER_PAYDAY = 23;
const DAY_MS = 86_400_000;

const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  return toDay(utc(day) + n * DAY_MS);
}

/** Days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

/** First day of cycle `month`: payday in the previous month. */
export function cycleStart(month: string): string {
  const previous = addMonths(month, -1);
  const day = previous.endsWith("-12") ? DECEMBER_PAYDAY : PAYDAY;
  let ms = utc(`${previous}-${String(day).padStart(2, "0")}`);
  // Weekend: move back to Friday.
  while ([0, 6].includes(new Date(ms).getUTCDay())) ms -= DAY_MS;
  return toDay(ms);
}

/** Last day of cycle `month` (the day before the next payday). */
export function cycleEnd(month: string): string {
  return addDays(cycleStart(addMonths(month, 1)), -1);
}

/** Cycle of a "YYYY-MM-DD" day. */
export function cycleOfDay(day: string): Month {
  const month = day.slice(0, 7) as Month;
  return day >= cycleStart(addMonths(month, 1)) ? addMonths(month, 1) : month;
}

/** Cycle of a date, in Lisbon time. */
export function cycleOf(date: Date): Month {
  return cycleOfDay(dayOf(date));
}

const NOTE_DATE_RE = /^\s*(\d{1,2})\/(\d{1,2})(?!\d|\/\d)/;

/**
 * Day the transaction really happened: the date in the note ("25/9 - Racket") when it is
 * plausible for the transaction's cycle; otherwise the day it was recorded in Wallet.
 */
export function actualDay(t: { month: string; date: Date; note: string }): string {
  const recorded = dayOf(t.date);
  const r = NOTE_DATE_RE.exec(t.note);
  if (!r) return recorded;
  const day = Number(r[1]);
  const mm = Number(r[2]);
  if (mm < 1 || mm > 12 || day < 1 || day > 31) return recorded;
  const year = Number(t.month.slice(0, 4));
  const start = addDays(cycleStart(t.month), -10);
  const end = addDays(cycleEnd(t.month), 10);
  for (const y of [year, year - 1]) {
    const d = `${y}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (d.slice(5) === toDay(utc(d)).slice(5) && d >= start && d <= end) return d;
  }
  return recorded;
}
