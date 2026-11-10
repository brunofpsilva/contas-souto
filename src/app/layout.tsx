import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { COOKIE_TEMA, CORES, lerTema } from "@/lib/tema";
import "./globals.css";

// Uma só família para títulos, texto e números (tem algarismos tabulares).
const sans = Instrument_Sans({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Contas Souto", template: "%s · Contas Souto" },
  description: "Despesas da casa e saldo previsto.",
  applicationName: "Contas Souto",
  // No ecrã principal do iPhone abre como app, sem a barra do Safari.
  appleWebApp: { capable: true, title: "Contas Souto", statusBarStyle: "default" },
  // O iOS não transforma valores como "912 345 678" em ligações de telefone.
  formatDetection: { telephone: false, email: false, address: false },
};

/** A barra do browser acompanha o tema: o escolhido nas Definições ou, sem escolha, o do sistema. */
export async function generateViewport(): Promise<Viewport> {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    // Ocupa o ecrã todo (notch, barra do fundo); as margens seguras vêm do CSS.
    viewportFit: "cover",
    themeColor: tema
      ? CORES[tema].fundo
      : [
          { media: "(prefers-color-scheme: light)", color: CORES.claro.fundo },
          { media: "(prefers-color-scheme: dark)", color: CORES.escuro.fundo },
        ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return (
    // data-tema só existe com "Claro" ou "Escuro" escolhido; sem ele, o CSS segue o sistema.
    <html lang="pt-PT" data-tema={tema ?? undefined} className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
