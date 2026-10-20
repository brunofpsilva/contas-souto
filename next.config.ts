import type { NextConfig } from "next";

// Cache Components fica desligado: todas as páginas dependem da sessão e dos
// dados mais recentes, por isso são sempre geradas no momento do pedido.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
