"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SegmentedChoice } from "@/components/segmented";
import { useT } from "@/i18n/client";
import { LOCALE_COOKIE, messagesFor, readLocale, type Locale } from "@/i18n/config";

// Each language is written in itself, so it can be found whatever language is on screen.
const OPTIONS = [
  { value: "pt", text: "Português" },
  { value: "en", text: "English" },
];

/** Português or English. Kept in a cookie for a year; the server renders the pages in that language. */
export function LanguagePicker({ initial }: { initial: Locale }) {
  const t = useT();
  const [value, setValue] = useState<string>(initial);
  const router = useRouter();

  function change(next: string) {
    setValue(next);
    const locale = readLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = messagesFor(locale).intl;
    // The texts come from the server (and the provider in the root layout): render again.
    router.refresh();
  }

  return <SegmentedChoice name="language" label={t.settings.language} hideLabel options={OPTIONS} value={value} onChange={change} />;
}
