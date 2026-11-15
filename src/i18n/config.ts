// App language: Portuguese (default) or English. The choice lives in a cookie, read on the
// server, so pages already arrive in the right language.
import { en } from "./en";
import { pt, type Messages } from "./pt";

export type { Messages };

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";

/** Cookie that remembers the language chosen in Settings. */
export const LOCALE_COOKIE = "locale";

const MESSAGES: Record<Locale, Messages> = { pt, en };

/** Cookie value; anything else is the default language. */
export function readLocale(value: string | undefined): Locale {
  return LOCALES.find((l) => l === value) ?? DEFAULT_LOCALE;
}

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}
