import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { I18nProvider } from "@/i18n/client";
import { LOCALE_COOKIE, messagesFor, readLocale } from "@/i18n/config";
import { COLORS, readTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

// A single family for titles, text and numbers (it has tabular figures).
const sans = Instrument_Sans({ variable: "--font-sans", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = messagesFor(readLocale((await cookies()).get(LOCALE_COOKIE)?.value));
  return {
    title: { default: t.app.name, template: `%s · ${t.app.name}` },
    description: t.app.description,
    applicationName: t.app.name,
    // On the iPhone home screen it opens as an app, without the Safari bar.
    appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "default" },
    // iOS doesn't turn values like "912 345 678" into phone links.
    formatDetection: { telephone: false, email: false, address: false },
  };
}

/** The browser bar follows the theme: the one chosen in Settings or, without a choice, the system's. */
export async function generateViewport(): Promise<Viewport> {
  const theme = readTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    // Fills the whole screen (notch, bottom bar); the safe margins come from the CSS.
    viewportFit: "cover",
    themeColor: theme
      ? COLORS[theme].canvas
      : [
          { media: "(prefers-color-scheme: light)", color: COLORS.light.canvas },
          { media: "(prefers-color-scheme: dark)", color: COLORS.dark.canvas },
        ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const theme = readTheme(jar.get(THEME_COOKIE)?.value);
  const locale = readLocale(jar.get(LOCALE_COOKIE)?.value);
  return (
    // data-theme only exists with "Light" or "Dark" chosen; without it, the CSS follows the system.
    <html lang={messagesFor(locale).intl} data-theme={theme ?? undefined} className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
