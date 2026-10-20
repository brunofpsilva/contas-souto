// Agrupa as despesas por mês para as listas. Uma despesa por pagar de um mês
// já passado aparece no mês atual, marcada como atrasada (como no cálculo).
import type { Estado } from "./dominio";

export interface DespesaAgrupavel {
  id: number;
  valor: number;
  mes: string;
  estado: Estado;
}

export interface GrupoMes<T> {
  mes: string;
  despesas: Array<T & { atrasada: boolean }>;
  porPagar: number;
  pago: number;
}

export function agruparPorMes<T extends DespesaAgrupavel>(lista: readonly T[], mesAtual: string): GrupoMes<T>[] {
  const grupos = new Map<string, GrupoMes<T>>();
  for (const d of lista) {
    const atrasada = d.estado !== "pago" && d.mes < mesAtual;
    const mes = atrasada ? mesAtual : d.mes;
    let g = grupos.get(mes);
    if (!g) {
      g = { mes, despesas: [], porPagar: 0, pago: 0 };
      grupos.set(mes, g);
    }
    g.despesas.push({ ...d, atrasada });
    if (d.estado === "pago") g.pago += d.valor;
    else g.porPagar += d.valor;
  }
  const arred = (v: number) => Math.round(v * 100) / 100;
  return [...grupos.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((g) => ({
      ...g,
      porPagar: arred(g.porPagar),
      pago: arred(g.pago),
      // Atrasadas primeiro, depois por pagar, depois pagas; dentro de cada, maior valor primeiro.
      despesas: g.despesas.sort(
        (a, b) =>
          Number(b.atrasada) - Number(a.atrasada) ||
          Number(a.estado === "pago") - Number(b.estado === "pago") ||
          b.valor - a.valor ||
          a.id - b.id,
      ),
    }));
}

/** Total por categoria, separando pago e por pagar (para o dashboard). */
export function totaisPorCategoria<T extends DespesaAgrupavel & { categoria: string }>(lista: readonly T[]) {
  const m = new Map<string, { categoria: string; pago: number; porPagar: number }>();
  for (const d of lista) {
    const t = m.get(d.categoria) ?? { categoria: d.categoria, pago: 0, porPagar: 0 };
    if (d.estado === "pago") t.pago += d.valor;
    else t.porPagar += d.valor;
    m.set(d.categoria, t);
  }
  const arred = (v: number) => Math.round(v * 100) / 100;
  return [...m.values()]
    .map((t) => ({ ...t, pago: arred(t.pago), porPagar: arred(t.porPagar), total: arred(t.pago + t.porPagar) }))
    .sort((a, b) => b.total - a.total);
}
