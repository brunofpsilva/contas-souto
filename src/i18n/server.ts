// Language on the server (pages, metadata and server actions), from the cookie.
import { cookies } from "next/headers";
import { LOCALE_COOKIE, messagesFor, readLocale, type Locale, type Messages } from "./config";

export async function getLocale(): Promise<Locale> {
  return readLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** The texts in the current language. */
export async function getT(): Promise<Messages> {
  return messagesFor(await getLocale());
}
