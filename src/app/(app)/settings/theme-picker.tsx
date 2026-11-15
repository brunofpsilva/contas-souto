"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SegmentedChoice } from "@/components/segmented";
import { useT } from "@/i18n/client";
import { readTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/** System, Light or Dark. Applies on tap and is kept in a cookie for a year. */
export function ThemePicker({ initial }: { initial: Theme | null }) {
  const t = useT();
  const [value, setValue] = useState<string>(initial ?? "system");
  const router = useRouter();

  function change(next: string) {
    setValue(next);
    const theme = readTheme(next);
    document.cookie = `${THEME_COOKIE}=${theme ?? ""}; path=/; max-age=${theme ? 60 * 60 * 24 * 365 : 0}; samesite=lax`;
    // Change the colours right away; the server then sets the same attribute on <html> from the cookie.
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    // The browser bar colour comes from the server (generateViewport).
    router.refresh();
  }

  return (
    <SegmentedChoice
      name="theme"
      label={t.settings.theme}
      hideLabel
      options={[
        { value: "system", text: t.settings.themes.system },
        { value: "light", text: t.settings.themes.light },
        { value: "dark", text: t.settings.themes.dark },
      ]}
      value={value}
      onChange={change}
    />
  );
}
