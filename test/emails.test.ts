import { describe, expect, test } from "vitest";
import { isAllowedEmail, parseAllowedEmails } from "@/lib/emails";

describe("ALLOWED_EMAILS", () => {
  const list = parseAllowedEmails(" Ana@Gmail.com , rui@gmail.com,, junk ");

  test("reads the list without spaces or upper case and ignores invalid entries", () => {
    expect([...list]).toEqual(["ana@gmail.com", "rui@gmail.com"]);
  });

  test("only accepts emails on the list", () => {
    expect(isAllowedEmail("ana@gmail.com", list)).toBe(true);
    expect(isAllowedEmail(" RUI@gmail.com", list)).toBe(true);
    expect(isAllowedEmail("other@gmail.com", list)).toBe(false);
    expect(isAllowedEmail("ana@gmail.com.evil.com", list)).toBe(false);
    expect(isAllowedEmail(null, list)).toBe(false);
  });

  test("empty or missing list: nobody gets in", () => {
    expect(isAllowedEmail("ana@gmail.com", parseAllowedEmails(""))).toBe(false);
  });
});
