import { describe, expect, test } from "vitest";
import { agruparPorMes, totaisPorCategoria } from "@/lib/agrupar";

const d = (id: number, valor: number, mes: string, estado: "previsto" | "pago" = "previsto", categoria = "Outros") => ({
  id,
  valor,
  mes,
  estado,
  categoria,
});

describe("agruparPorMes", () => {
  test("atrasadas vão para o mês atual; pagas antigas ficam no seu mês", () => {
    const g = agruparPorMes([d(1, 100, "2026-08"), d(2, 50, "2026-08", "pago"), d(3, 300, "2026-10"), d(4, 20, "2026-12")], "2026-10");
    expect(g.map((x) => x.mes)).toEqual(["2026-08", "2026-10", "2026-12"]);
    expect(g[1].despesas.map((x) => [x.id, x.atrasada])).toEqual([
      [1, true],
      [3, false],
    ]);
    expect(g[1].porPagar).toBe(400);
    expect(g[0].pago).toBe(50);
  });

  test("dentro do mês: por pagar antes de pagas, maior valor primeiro", () => {
    const g = agruparPorMes([d(1, 10, "2026-11", "pago"), d(2, 5, "2026-11"), d(3, 50, "2026-11")], "2026-10");
    expect(g[0].despesas.map((x) => x.id)).toEqual([3, 2, 1]);
  });
});

describe("totaisPorCategoria", () => {
  test("separa pago e por pagar e ordena pelo total", () => {
    const t = totaisPorCategoria([d(1, 100, "2026-11", "pago", "Obras"), d(2, 0.1, "2026-11", "previsto", "Obras"), d(3, 0.2, "2026-11", "previsto", "Obras"), d(4, 50, "2026-12", "previsto", "Mobília")]);
    expect(t).toEqual([
      { categoria: "Obras", pago: 100, porPagar: 0.3, total: 100.3 },
      { categoria: "Mobília", pago: 0, porPagar: 50, total: 50 },
    ]);
  });
});
