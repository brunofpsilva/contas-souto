// Cálculo da previsão: saldo disponível hoje menos as despesas por pagar, mês a mês.
// Regras (iguais à versão antiga):
// - despesas pagas não entram, porque já saíram das contas;
// - despesa por pagar com mês já passado conta no mês atual e fica "atrasada";
// - horizonte de pelo menos 6 meses, estendido até à última despesa (máximo 36);
// - não há poupança mensal no cálculo.

import { mesDe, somarMeses, type Mes } from "./meses";

export type EstadoDespesa = "previsto" | "pago";

export interface DespesaPrevisao {
  valor: number;
  mes: string; // AAAA-MM
  estado: EstadoDespesa;
}

export interface MesPrevisao {
  mes: Mes;
  saidas: number;
  atrasadas: number;
  saldo: number | null;
}

export type EstadoGeral = "sem-saldos" | "nada-por-pagar" | "falta" | "abaixo-reserva" | "ok";

export interface ResumoPrevisao {
  disponivel: number | null;
  porPagar: number;
  nPorPagar: number;
  pago: number;
  nPagas: number;
  saldoFinal: number | null;
  estado: EstadoGeral;
  /** Primeiro mês em que falta dinheiro ou fica abaixo da reserva. */
  mesAlerta: Mes | null;
  /** Saldo mais baixo do horizonte (só quando o estado é "ok"). */
  saldoMinimo: number | null;
}

export interface Previsao {
  mesAtual: Mes;
  meses: MesPrevisao[];
  resumo: ResumoPrevisao;
  reserva: number;
}

export const MESES_MINIMOS = 6;
export const MESES_MAXIMOS = 36;

const arred = (v: number) => Math.round(v * 100) / 100;

export function eAtrasada(d: DespesaPrevisao, mesAtual: string): boolean {
  return d.estado !== "pago" && d.mes < mesAtual;
}

export function calcularPrevisao({
  despesas,
  disponivel,
  reserva = 0,
  hoje = new Date(),
  mesesMinimos = MESES_MINIMOS,
}: {
  despesas: readonly DespesaPrevisao[];
  disponivel: number | null;
  reserva?: number;
  hoje?: Date;
  mesesMinimos?: number;
}): Previsao {
  const atual = mesDe(hoje);
  const porPagar = despesas.filter((d) => d.estado !== "pago");
  const pagas = despesas.filter((d) => d.estado === "pago");

  let ultimo: string = somarMeses(atual, mesesMinimos - 1);
  for (const d of porPagar) if (d.mes > ultimo) ultimo = d.mes;

  const meses: MesPrevisao[] = [];
  for (let k = atual; k <= ultimo && meses.length < MESES_MAXIMOS; k = somarMeses(k, 1)) {
    meses.push({ mes: k, saidas: 0, atrasadas: 0, saldo: null });
  }
  const porMes = new Map(meses.map((m) => [m.mes as string, m]));
  for (const d of porPagar) {
    const atrasada = d.mes < atual;
    const alvo = porMes.get(atrasada ? atual : d.mes);
    if (!alvo) continue; // para lá do limite de 36 meses
    alvo.saidas += d.valor;
    if (atrasada) alvo.atrasadas += d.valor;
  }

  let saldo = disponivel;
  for (const m of meses) {
    m.saidas = arred(m.saidas);
    m.atrasadas = arred(m.atrasadas);
    if (saldo != null) {
      saldo = arred(saldo - m.saidas);
      m.saldo = saldo;
    }
  }

  const soma = (l: readonly DespesaPrevisao[]) => arred(l.reduce((s, d) => s + d.valor, 0));
  const resumo: ResumoPrevisao = {
    disponivel,
    porPagar: soma(porPagar),
    nPorPagar: porPagar.length,
    pago: soma(pagas),
    nPagas: pagas.length,
    saldoFinal: meses.length ? meses[meses.length - 1].saldo : disponivel,
    estado: "ok",
    mesAlerta: null,
    saldoMinimo: null,
  };

  if (disponivel == null) resumo.estado = "sem-saldos";
  else if (!porPagar.length) resumo.estado = "nada-por-pagar";
  else {
    const saldos = meses.filter((m): m is MesPrevisao & { saldo: number } => m.saldo != null);
    const neg = saldos.find((m) => m.saldo < 0);
    const baixo = reserva > 0 ? saldos.find((m) => m.saldo < reserva) : undefined;
    if (neg) {
      resumo.estado = "falta";
      resumo.mesAlerta = neg.mes;
    } else if (baixo) {
      resumo.estado = "abaixo-reserva";
      resumo.mesAlerta = baixo.mes;
    } else {
      resumo.estado = "ok";
      resumo.saldoMinimo = Math.min(...saldos.map((m) => m.saldo));
    }
  }

  return { mesAtual: atual, meses, resumo, reserva };
}
