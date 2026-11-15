"use client";

// Language in client components. The root layout passes the locale read from the cookie; the
// texts are looked up here because functions can't travel from the server to the browser.
import { createContext, use } from "react";
import { DEFAULT_LOCALE, messagesFor, type Locale, type Messages } from "./config";

const Context = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Context value={locale}>{children}</Context>;
}

/** The texts in the current language. */
export function useT(): Messages {
  return messagesFor(use(Context));
}
