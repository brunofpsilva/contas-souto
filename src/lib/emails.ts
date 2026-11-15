// List of allowed emails (ALLOWED_EMAILS, comma-separated).
// Compared without case or spaces. An empty list means nobody gets in.

export function parseAllowedEmails(value: string | undefined = process.env.ALLOWED_EMAILS): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export function isAllowedEmail(email: string | null | undefined, list = parseAllowedEmails()): boolean {
  if (!email) return false;
  return list.has(email.trim().toLowerCase());
}
