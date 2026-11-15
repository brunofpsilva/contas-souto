import { describe, expect, test } from "vitest";
import { actualDay, cycleEnd, cycleOf, cycleOfDay, cycleStart } from "@/lib/cycle";

describe("salary cycles", () => {
  test.each([
    // [cycle, start] — confirmed by the Wallet notes
    ["2026-11", "2026-10-26"], // Monday
    ["2026-10", "2026-09-25"], // the 26th is a Saturday
    ["2026-08", "2026-07-24"], // the 26th is a Sunday
    ["2026-05", "2026-04-24"], // the 26th is a Sunday
    ["2025-11", "2025-10-24"], // the 26th is a Sunday
    ["2026-01", "2025-12-23"], // Christmas
  ])("cycle %s starts on %s", (month, start) => {
    expect(cycleStart(month)).toBe(start);
  });

  test("the cycle ends the day before the next payday", () => {
    expect(cycleEnd("2026-10")).toBe("2026-10-25");
    expect(cycleEnd("2026-09")).toBe("2026-09-24");
    expect(cycleEnd("2025-12")).toBe("2025-12-22");
  });

  test("cycle of a day and of a date in Lisbon", () => {
    expect(cycleOfDay("2026-10-25")).toBe("2026-10");
    expect(cycleOfDay("2026-10-26")).toBe("2026-11");
    expect(cycleOfDay("2026-09-25")).toBe("2026-10");
    expect(cycleOfDay("2025-12-23")).toBe("2026-01");
    expect(cycleOfDay("2026-12-18")).toBe("2026-12");
    expect(cycleOf(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10");
  });

  test("actual day: the note's date when plausible, otherwise the recorded one", () => {
    const t = (note: string) => ({ month: "2026-10", date: new Date("2026-10-01T23:05:00Z"), note });
    expect(actualDay(t("25/9"))).toBe("2026-09-25");
    expect(actualDay(t("28/9 - Viagem Porto"))).toBe("2026-09-28");
    expect(actualDay(t("1/10"))).toBe("2026-10-01");
    expect(actualDay(t(""))).toBe("2026-10-02"); // 23:05 UTC = 00:05 on 2 Oct in Lisbon
    expect(actualDay(t("3/4 - bilhetes"))).toBe("2026-10-02"); // far from the cycle: ignored
    expect(actualDay(t("31/2"))).toBe("2026-10-02"); // impossible date
    expect(actualDay({ month: "2026-01", date: new Date("2026-01-02T00:00:00Z"), note: "27/12" })).toBe("2025-12-27");
  });
});
