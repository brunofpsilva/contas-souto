// Months as "YYYY-MM". The current month is always taken in Lisbon time,
// even when the server runs in another time zone (Vercel runs in UTC).

export type Month = `${number}-${number}`;

export const TIME_ZONE = "Europe/Lisbon";
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(v: string): v is Month {
  return MONTH_RE.test(v);
}

// Created once: building an Intl.DateTimeFormat costs ~70µs, and the trend formats every transaction.
// en-CA formats as "2026-10" and "2026-10-31".
const MONTH_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit" });
const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Month of a date in Lisbon time. */
export function monthOf(date: Date): Month {
  return MONTH_FORMAT.format(date) as Month;
}

/** Day of a date in Lisbon time, "YYYY-MM-DD". */
export function dayOf(date: Date): string {
  return DAY_FORMAT.format(date);
}

export function addMonths(month: string, n: number): Month {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${year}-${String(mm).padStart(2, "0")}` as Month;
}

/** Current year, in Lisbon time. */
export function currentYear(): number {
  return Number(dayOf(new Date()).slice(0, 4));
}
