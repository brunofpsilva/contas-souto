import type { MetadataRoute } from "next";
import { CORES } from "@/lib/tema";

// O manifest só aceita uma cor de cada: ficam as do tema claro. Com a app aberta, a barra
// do browser segue o tema (generateViewport em layout.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Contas Souto",
    short_name: "Contas Souto",
    description: "Despesas da casa e saldo previsto.",
    lang: "pt-PT",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: CORES.claro.fundo,
    theme_color: CORES.claro.fundo,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
