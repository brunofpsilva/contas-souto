// Formats in the current language (docs/redesenho-ux.md, section 6): one currency format, one
// minus sign and two dates (short "12 Dec", long "December 2026"). Every function takes the
// dictionary `t` of the language.
import type { Messages } from "@/i18n/config";
import type { Forecast, ForecastSummary } from "./forecast";
import { currentYear } from "./months";

const formatters = new Map<string, { cents: Intl.NumberFormat; whole: Intl.NumberFormat }>();

function euroFormatters(intl: string) {
  let f = formatters.get(intl);
  if (!f) {
    // pt-PT doesn't group 4-digit thousands by default: "1 234,56 €" needs useGrouping.
    const base = { style: "currency", currency: "EUR", useGrouping: "always" } as const;
    f = { cents: new Intl.NumberFormat(intl, base), whole: new Intl.NumberFormat(intl, { ...base, maximumFractionDigits: 0 }) };
    formatters.set(intl, f);
  }
  return f;
}

/** The typographic minus sign (U+2212), the only one used in the app. */
const MINUS = "−";

/**
 * "1 234,56 €" / "€1,234.56". `whole` rounds to the euro (totals, forecast, budget); `sign`
 * puts "+" on positive values (forecast parts). Without a value it shows a dash.
 */
export function formatEuros(t: Messages, v: number | null | undefined, { whole = false, sign = false } = {}): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const rounded = whole ? Math.round(v) : Math.round(v * 100) / 100;
  const f = euroFormatters(t.intl);
  const text = (whole ? f.whole : f.cents).format(Math.abs(rounded));
  if (rounded < 0) return MINUS + text;
  return sign && rounded > 0 ? `+${text}` : text;
}

/** Compact number for chart axes ("123,5 mil" / "123.5K"). */
export function compactNumber(t: Messages, v: number): string {
  return new Intl.NumberFormat(t.intl, { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

/** A plain number in the language's format (accounts in other currencies). */
export function formatNumber(t: Messages, v: number): string {
  return v.toLocaleString(t.intl);
}

/** An amount as it is written back into a form field ("1234,5" / "1234.5"). */
export function toInputAmount(t: Messages, v: number): string {
  return String(v).replace(".", t.decimal);
}

const DATE_TIME_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "10 nov, 09:14", in Lisbon time. */
export function formatDateTime(t: Messages, d: Date | string | null | undefined): string {
  if (!d) return "—";
  const p = Object.fromEntries(DATE_TIME_PARTS.formatToParts(typeof d === "string" ? new Date(d) : d).map((x) => [x.type, x.value]));
  return t.dates.dateTime(Number(p.day), t.months.short[Number(p.month) - 1], `${p.hour}:${p.minute}`);
}

/** "12 dez" in the current year, "15 jan 2027" in other years. `date` is "YYYY-MM-DD". */
export function shortDate(t: Messages, date: string, year: number = currentYear()): string {
  const [y, m, d] = date.split("-").map(Number);
  return t.dates.short(d, t.months.short[m - 1], y === year ? undefined : y);
}

/** "dezembro de 2026" / "December 2026" */
export function monthYear(t: Messages, month: string): string {
  const [y, m] = month.split("-").map(Number);
  return t.months.withYear(t.months.long[m - 1], y);
}

/** "dezembro" in the current year, "janeiro de 2027" in other years (lists and month titles). */
export function longMonth(t: Messages, month: string, year: number = currentYear()): string {
  const [y, m] = month.split("-").map(Number);
  return y === year ? t.months.long[m - 1] : t.months.withYear(t.months.long[m - 1], y);
}

/** On the chart axis: only the month ("dez"), with the year at the turn of the year ("jan 27"). */
export function axisMonth(t: Messages, month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? t.months.axisWithYear(t.months.short[0], String(y).slice(-2)) : t.months.short[m - 1];
}

/** First letter in upper case ("dezembro de 2026" → "Dezembro de 2026"). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type Tone = "ok" | "warning" | "bad" | "neutral";

/**
 * Sentence for the overall status. With `f`, if the alert comes from a milestone's payments (the
 * balance only drops below the limit after it), it says "at the deed" or "at the end of
 * construction" instead of the month.
 */
export function statusText(t: Messages, s: ForecastSummary, f?: Pick<Forecast, "milestones" | "reserve">): { text: string; tone: Tone } {
  let when = t.forecastStatus.inMonth(monthYear(t, s.alertMonth ?? "2000-01"));
  const limit = s.status === "short" ? 0 : (f?.reserve ?? 0);
  const ofMonth = f?.milestones.filter((m) => m.month === s.alertMonth) ?? [];
  if (ofMonth[0]?.before && ofMonth[0].before.base >= limit) {
    const culprit = ofMonth.find((m) => m.after && m.after.base < limit);
    if (culprit) when = t.milestones[culprit.kind].at;
  }
  switch (s.status) {
    case "short":
      return { text: t.forecastStatus.short(when), tone: "bad" };
    case "below-reserve":
      return { text: t.forecastStatus.belowReserve(when), tone: "warning" };
    case "ok":
      return { text: t.forecastStatus.ok, tone: "ok" };
    case "nothing-to-pay":
      return { text: t.forecastStatus.nothingToPay, tone: "neutral" };
    case "no-balances":
      return { text: t.forecastStatus.noBalances, tone: "neutral" };
  }
}
