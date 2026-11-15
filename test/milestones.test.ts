import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { shortDate } from "@/lib/format";
import { isValidDate, monthOfDate, parseMilestoneDate } from "@/lib/milestones";

describe("milestone dates", () => {
  test.each([
    ["2026-12-15", true],
    ["2028-02-29", true],
    ["2027-02-29", false],
    ["2026-13-01", false],
    ["2026-12-1", false],
    ["15/12/2026", false],
    ["1999-01-01", false],
  ])("%s -> %s", (v, ok) => expect(isValidDate(v)).toBe(ok));

  test("month and short format without going through UTC", () => {
    expect(monthOfDate("2026-12-01")).toBe("2026-12");
    // The year only shows when it isn't the current one.
    expect(shortDate(pt, "2026-12-01", 2026)).toBe("1 dez");
    expect(shortDate(pt, "2027-01-15", 2026)).toBe("15 jan 2027");
    expect(shortDate(en, "2027-01-15", 2026)).toBe("15 Jan 2027");
  });
});

describe("parseMilestoneDate", () => {
  test("empty clears the date", () => {
    expect(parseMilestoneDate("")).toEqual({ ok: true, date: null });
    expect(parseMilestoneDate(null)).toEqual({ ok: true, date: null });
  });

  test("accepts a valid date and refuses an invalid one", () => {
    expect(parseMilestoneDate(" 2026-12-15 ")).toEqual({ ok: true, date: "2026-12-15" });
    expect(parseMilestoneDate("2026-02-30").ok).toBe(false);
  });
});
