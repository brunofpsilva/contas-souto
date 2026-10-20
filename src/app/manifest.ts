import type { MetadataRoute } from "next";
import { COR_ICONE } from "@/lib/icone";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Contas Souto",
    short_name: "Contas Souto",
    description: "Previsão das despesas da casa no Souto contra o dinheiro nas contas do Wallet.",
    lang: "pt-PT",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f4f1",
    theme_color: COR_ICONE,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
