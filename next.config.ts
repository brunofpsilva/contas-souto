import type { NextConfig } from "next";

// Cache Components stays off: every page depends on the session and on the latest data, so they
// are always rendered at request time.
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
  // The addresses used to be in Portuguese. The old ones keep working (saved shortcuts, the
  // installed app). "/contas" is even older: it became the settings screen.
  async redirects() {
    return [
      { source: "/despesas", destination: "/expenses", permanent: true },
      { source: "/despesas/nova", destination: "/expenses/new", permanent: true },
      { source: "/despesas/:id/editar", destination: "/expenses/:id/edit", permanent: true },
      { source: "/previsao", destination: "/forecast", permanent: true },
      { source: "/previsao/gastos", destination: "/forecast/spending", permanent: true },
      { source: "/orcamento", destination: "/budget", permanent: true },
      { source: "/orcamento/editar", destination: "/budget/edit", permanent: true },
      { source: "/definicoes", destination: "/settings", permanent: true },
      { source: "/contas", destination: "/settings", permanent: true },
    ];
  },
};

export default nextConfig;
