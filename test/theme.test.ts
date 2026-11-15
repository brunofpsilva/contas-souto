import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { COLORS, readTheme } from "@/lib/theme";

// Reads the colour tokens straight from globals.css, so the test follows what the app uses.
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`"${selector}" not found in globals.css`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]));
}

const light = tokens(":root");
const systemDark = tokens(':root:not([data-theme="light"])');
const chosenDark = tokens(':root[data-theme="dark"]');

/** WCAG 2.x contrast ratio between two "#rrggbb" colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum]: 4.5 for text; 3 for control outlines and charts.
const PAIRS: [string, string, number][] = [
  ["ink", "canvas", 4.5],
  ["ink", "surface", 4.5],
  ["ink", "surface-muted", 4.5],
  ["ink-muted", "canvas", 4.5],
  ["ink-muted", "surface", 4.5],
  ["ink-muted", "surface-muted", 4.5],
  ["brand", "canvas", 4.5],
  ["brand", "surface", 4.5],
  ["brand", "brand-muted", 4.5],
  ["on-brand", "brand", 4.5],
  ["positive", "canvas", 4.5],
  ["positive", "surface", 4.5],
  ["positive", "positive-muted", 4.5],
  ["warning", "canvas", 4.5],
  ["warning", "surface", 4.5],
  ["warning", "warning-muted", 4.5],
  ["negative", "canvas", 4.5],
  ["negative", "surface", 4.5],
  ["negative", "negative-muted", 4.5],
  ["line-strong", "canvas", 3],
  ["line-strong", "surface", 3],
  ["chart-paid", "surface", 3],
  ["chart-paid", "surface-muted", 3],
  ["chart-unpaid", "surface", 3],
  ["chart-unpaid", "surface-muted", 3],
];

describe("colour tokens", () => {
  test("both themes have the same tokens", () => {
    expect(Object.keys(light).length).toBeGreaterThanOrEqual(18);
    expect(Object.keys(chosenDark).sort()).toEqual(Object.keys(light).sort());
  });

  test("the system dark and the chosen dark are the same", () => {
    expect(systemDark).toEqual(chosenDark);
  });

  describe.each([
    ["light", light],
    ["dark", chosenDark],
  ])("AA contrast in the %s theme", (_name, theme) => {
    test.each(PAIRS)("%s on %s ≥ %s", (fg, bg, min) => {
      expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
    });
  });

  test("the colours used outside the CSS are the tokens' ones", () => {
    for (const [name, theme] of [["light", light], ["dark", chosenDark]] as const) {
      expect(COLORS[name]).toEqual({ canvas: theme.canvas, brand: theme.brand, onBrand: theme["on-brand"] });
    }
  });
});

describe("readTheme", () => {
  test("only accepts light and dark; anything else is the system theme", () => {
    expect(readTheme("light")).toBe("light");
    expect(readTheme("dark")).toBe("dark");
    expect(readTheme(undefined)).toBeNull();
    expect(readTheme("blue")).toBeNull();
  });
});
