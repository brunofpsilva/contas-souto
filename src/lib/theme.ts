// App theme: "System" (no cookie), "Light" or "Dark". The cookie is read on the server and set
// on <html> (data-theme), so the page already arrives with the right colours.

/** Cookie that remembers the theme chosen in Settings. */
export const THEME_COOKIE = "theme";

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Cookie value; anything else is "System" (null). */
export function readTheme(value: string | undefined): Theme | null {
  return THEMES.find((t) => t === value) ?? null;
}

/**
 * Colours used outside the CSS (browser bar, manifest and icon). They are the same as in
 * src/app/globals.css; test/theme.test.ts checks they don't drift apart.
 */
export const COLORS: Record<Theme, { canvas: string; brand: string; onBrand: string }> = {
  light: { canvas: "#f6f4f0", brand: "#1d5873", onBrand: "#ffffff" },
  dark: { canvas: "#141310", brand: "#7cc4e0", onBrand: "#0b2530" },
};
