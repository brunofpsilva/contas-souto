import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Mesma tipografia da versão antiga: títulos, texto e números.
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });
const sans = Instrument_Sans({ variable: "--font-sans", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Contas Souto", template: "%s · Contas Souto" },
  description: "Previsão das despesas da casa no Souto contra o dinheiro nas contas do Wallet.",
  applicationName: "Contas Souto",
  // No ecrã principal do iPhone abre como app, sem a barra do Safari.
  appleWebApp: { capable: true, title: "Contas Souto", statusBarStyle: "default" },
  // O iOS não transforma valores como "912 345 678" em ligações de telefone.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Ocupa o ecrã todo (notch, barra do fundo); as margens seguras vêm do CSS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141917" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
