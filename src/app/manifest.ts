import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, messagesFor } from "@/i18n/config";
import { COLORS } from "@/lib/theme";

// The manifest only takes one colour of each kind: the light theme's. With the app open, the
// browser bar follows the theme (generateViewport in layout.tsx). It is read once when the app
// is installed, so it uses the default language.
export default function manifest(): MetadataRoute.Manifest {
  const t = messagesFor(DEFAULT_LOCALE);
  return {
    id: "/",
    name: t.app.name,
    short_name: t.app.name,
    description: t.app.description,
    lang: t.intl,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: COLORS.light.canvas,
    theme_color: COLORS.light.canvas,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
