// O que o ecrã Previsão mostra, a partir do que a previsão e a tendência já calcularam
// (funções puras, testadas). Aqui só se escolhem, somam e descrevem valores existentes:
// as regras e os cálculos estão em previsao.ts e tendencia.ts.
import { dataCurta, MARCOS } from "./escritura";
import { maiuscula, plural } from "./formato";
import { mesLongo } from "./meses";
import type { Previsao } from "./previsao";
import { picosDoCiclo, type CicloAtual, type GastoCiclo, type RendimentoAnual, type Tendencia } from "./tendencia";

const arred = (v: number) => Math.round(v * 100) / 100;

export interface ContasFeitas {
  saldoHoje: number;
  entradas: number;
  gastos: number;
  despesas: number;
  /** Onde as contas acabam: "Depois da escritura · 12 dez" ou "No fim de abril de 2027". */
  rotulo: string;
  /** saldoHoje + entradas − gastos − despesas */
  saldo: number;
}

/**
 * As contas de hoje até ao último marco (ou até ao fim da previsão, sem marcos): o que entra,
 * o que sai e o saldo que fica. É a soma verdadeira que a antiga linha "Total" não era.
 */
export function contasFeitas(p: Previsao, anoAtual?: number): ContasFeitas | null {
  const saldoHoje = p.resumo.disponivel;
  const ultimo = p.meses.at(-1);
  if (saldoHoje == null || !ultimo || ultimo.saldo == null) return null;
  const fim = p.fim?.depois ? p.fim : null;
  const meses = p.meses.filter((m) => m.mes <= (fim?.mes ?? ultimo.mes));
  const soma = (valor: (m: (typeof meses)[number]) => number) => arred(meses.reduce((s, m) => s + valor(m), 0));
  return {
    saldoHoje,
    entradas: soma((m) => m.entradasPrevistas),
    gastos: soma((m) => m.saidasPrevistas),
    despesas: soma((m) => m.saidas),
    rotulo: fim ? `${maiuscula(MARCOS[fim.tipo].depois)} · ${dataCurta(fim.data, anoAtual)}` : `No fim de ${mesLongo(ultimo.mes, anoAtual)}`,
    saldo: fim?.depois ? fim.depois.base : ultimo.saldo,
  };
}

export interface LinhaPrevisao {
  chave: string;
  /** "Dezembro", "Janeiro de 2027" ou, num marco, "Escritura · 12 dez". */
  titulo: string;
  /** Só no mês em curso: "até 25 nov". */
  ate?: string;
  /** A linha é um marco (os pagamentos da escritura ou do fim da obra). */
  marco: boolean;
  entradas: number;
  gastos: number;
  despesas: number;
  /** Saldo previsto no fim da linha. */
  saldo: number | null;
  /** O saldo fica abaixo de zero ou abaixo da reserva mínima. */
  alerta: "falta" | "reserva" | null;
  notas: { texto: string; valor?: number; privado?: boolean }[];
}

/**
 * Uma linha por mês e, nos meses com marcos, uma linha por marco a seguir. A linha do mês
 * mostra o saldo antes dos marcos; cada marco mostra o saldo depois dos seus pagamentos.
 */
export function linhasPrevisao(
  p: Previsao,
  {
    anuais = [],
    ciclo,
    gastosPorCiclo = [],
    anoAtual,
  }: { anuais?: readonly RendimentoAnual[]; ciclo?: CicloAtual; gastosPorCiclo?: readonly GastoCiclo[]; anoAtual?: number } = {},
): LinhaPrevisao[] {
  const alerta = (saldo: number | null): LinhaPrevisao["alerta"] =>
    saldo == null ? null : saldo < 0 ? "falta" : p.reserva > 0 && saldo < p.reserva ? "reserva" : null;

  const linhas: LinhaPrevisao[] = [];
  for (const m of p.meses) {
    const notas: LinhaPrevisao["notas"] = [];
    if (m.mes !== p.mesAtual) {
      for (const a of anuais) {
        if (a.valor > 0 && a.mesOrigem.slice(5) === m.mes.slice(5)) notas.push({ texto: `Inclui ${a.nome}`, valor: a.valor, privado: true });
      }
    }
    if (gastosPorCiclo.find((g) => g.mes === m.mes)?.editado != null) notas.push({ texto: "Gastos mensais ajustados" });
    if (m.atrasadas > 0) notas.push({ texto: "Atrasadas", valor: m.atrasadas });

    const marcos = p.marcos.filter((x) => x.mes === m.mes);
    const saldo = marcos[0]?.antes ? marcos[0].antes.base : m.saldo;
    linhas.push({
      chave: m.mes,
      titulo: maiuscula(mesLongo(m.mes, anoAtual)),
      ate: m.mes === p.mesAtual && p.comFluxos && ciclo ? `até ${dataCurta(ciclo.fim, anoAtual)}` : undefined,
      marco: false,
      entradas: p.comFluxos ? m.entradasPrevistas : 0,
      gastos: p.comFluxos ? m.saidasPrevistas : 0,
      despesas: arred(m.saidas - m.nosMarcos),
      saldo,
      alerta: alerta(saldo),
      notas,
    });
    for (const x of marcos) {
      const depois = x.depois ? x.depois.base : null;
      linhas.push({
        chave: x.tipo,
        titulo: `${MARCOS[x.tipo].titulo} · ${dataCurta(x.data, anoAtual)}`,
        marco: true,
        entradas: 0,
        gastos: 0,
        despesas: x.porPagar,
        saldo: depois,
        alerta: alerta(depois),
        notas: x.nPorPagar ? [{ texto: plural(x.nPorPagar, "despesa") }] : [],
      });
    }
  }
  return linhas;
}

export interface PossivelGasto {
  mes: string;
  /** Categorias que tiveram um gasto fora do habitual neste mês, no ano passado. */
  picos: { nome: string; total: number }[];
}

/**
 * Possíveis gastos no mês em curso e no seguinte: o que, no mesmo mês do ano passado, ficou
 * muito acima do habitual. No mês em curso, só o que ainda não aconteceu (menos de metade já
 * gasto nessa categoria). Não estão na previsão; servem para lembrar de ajustar o mês.
 */
export function possiveisGastos(t: Pick<Tendencia, "picos" | "mesAtual" | "cicloAtual">, meses: readonly string[]): PossivelGasto[] {
  return meses
    .slice(0, 2)
    .map((mes) => ({
      mes,
      picos: picosDoCiclo(t.picos, mes)
        .filter((g) => mes !== t.mesAtual || (t.cicloAtual.gastoPorCategoria[g.nome] ?? 0) < g.total / 2)
        .map((g) => ({ nome: g.nome, total: g.total })),
    }))
    .filter((x) => x.picos.length > 0);
}
