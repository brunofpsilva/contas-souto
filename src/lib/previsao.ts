// Cálculo da previsão: saldo disponível hoje, menos as despesas por pagar, mais o que
// se espera do dia a dia (salários menos gastos), mês a mês, até à escritura ou à
// conclusão da obra (a que for mais tarde), ou até à última despesa, se for depois.
// Regras:
// - despesas pagas não entram, porque já saíram das contas;
// - despesa por pagar com mês já passado conta no mês atual e fica "atrasada";
// - há dois marcos com data: a escritura e a conclusão da obra (pagamento final ao
//   empreiteiro). Cada despesa pode ser paga num deles e conta no mês desse marco.
//   Um marco só conta se ainda não passou; se já passou, as despesas dele contam pelo
//   mês guardado, como as outras;
// - com marcos (hoje ou no futuro): o horizonte vai do mês atual até ao mês do último.
//   No mês de um marco, o dia a dia e as despesas com mês próprio contam antes e as do
//   marco depois; dois marcos no mesmo mês seguem a ordem das datas. Se houver despesas
//   por pagar depois do último marco, a previsão continua até ao mês da última, igual;
// - sem marcos: pelo menos 6 meses, estendido até à última despesa (máximo 36);
// - os fluxos do dia a dia vêm de fora (tendência dos movimentos do Wallet) e trazem um
//   intervalo otimista/pessimista; sem eles, os três saldos são iguais.

import { mesDaData, type Marco } from "./escritura";
import { cicloDe } from "./ciclo";
import { somarMeses, type Mes } from "./meses";

export type EstadoDespesa = "previsto" | "pago";

export interface DespesaPrevisao {
  valor: number;
  mes: string; // AAAA-MM
  estado: EstadoDespesa;
  naEscritura?: boolean;
  naConclusaoObra?: boolean;
}

export interface Intervalo {
  base: number;
  otimista: number;
  pessimista: number;
}

/** Entradas e saídas esperadas num mês, fora das despesas da casa. */
export interface FluxoMes {
  mes: string;
  entradas: Intervalo;
  saidas: Intervalo;
}

export interface MesPrevisao {
  mes: Mes;
  /** Marcos que caem neste ciclo, por ordem de data. */
  marcos: Marco[];
  /** Despesas por pagar que saem neste mês (inclui as dos marcos). */
  saidas: number;
  atrasadas: number;
  /** Parte das saídas que é paga nos marcos deste mês. */
  nosMarcos: number;
  /** Fluxo do dia a dia (cenário base). */
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldo: number | null;
  saldoOtimista: number | null;
  saldoPessimista: number | null;
}

export interface ResultadoMarco {
  tipo: Marco;
  data: string;
  mes: Mes;
  /** Saldo imediatamente antes e depois dos pagamentos deste marco. */
  antes: Intervalo | null;
  depois: Intervalo | null;
  porPagar: number;
  nPorPagar: number;
  pago: number;
  nPagas: number;
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
  /** Saldo mais baixo do horizonte (quando não há alerta). */
  saldoMinimo: number | null;
}

export interface Previsao {
  mesAtual: Mes;
  meses: MesPrevisao[];
  resumo: ResumoPrevisao;
  reserva: number;
  /** Marcos de hoje em diante, por ordem de data. */
  marcos: ResultadoMarco[];
  /** null sem data ou se já passou. */
  escritura: ResultadoMarco | null;
  obra: ResultadoMarco | null;
  /** O último marco (a previsão pode continuar depois dele, até à última despesa). */
  fim: ResultadoMarco | null;
  /** De hoje até ao último marco (cenário base); null sem marcos. */
  percurso: { entradas: number; gastos: number; despesasCasa: number } | null;
  /** Despesas por pagar para lá do limite de 36 meses: não entram no saldo. */
  depoisDoFim: { n: number; valor: number };
  /** Há fluxos do dia a dia no cálculo (e por isso um intervalo). */
  comFluxos: boolean;
}

export const MESES_MINIMOS = 6;
export const MESES_MAXIMOS = 36;

const arred = (v: number) => Math.round(v * 100) / 100;
const CENARIOS = ["base", "otimista", "pessimista"] as const;
const somarIntervalo = (i: Intervalo, v: number): Intervalo => ({
  base: arred(i.base + v),
  otimista: arred(i.otimista + v),
  pessimista: arred(i.pessimista + v),
});

export function eAtrasada(d: DespesaPrevisao, mesAtual: string): boolean {
  return d.estado !== "pago" && d.mes < mesAtual;
}

/** O marco em que a despesa é paga, se for paga num. */
export function marcoDe(d: Pick<DespesaPrevisao, "naEscritura" | "naConclusaoObra">): Marco | null {
  return d.naEscritura ? "escritura" : d.naConclusaoObra ? "obra" : null;
}

export function calcularPrevisao({
  despesas,
  disponivel,
  reserva = 0,
  hoje = new Date(),
  mesesMinimos = MESES_MINIMOS,
  dataEscritura = null,
  dataConclusaoObra = null,
  fluxos = [],
}: {
  despesas: readonly DespesaPrevisao[];
  disponivel: number | null;
  reserva?: number;
  hoje?: Date;
  mesesMinimos?: number;
  /** AAAA-MM-DD */
  dataEscritura?: string | null;
  /** AAAA-MM-DD */
  dataConclusaoObra?: string | null;
  fluxos?: readonly FluxoMes[];
}): Previsao {
  const atual = cicloDe(hoje);
  const porPagar = despesas.filter((d) => d.estado !== "pago");
  const pagas = despesas.filter((d) => d.estado === "pago");

  // Um marco só define o horizonte se ainda não passou. No mesmo dia, a escritura vem primeiro.
  const datas: [Marco, string | null][] = [
    ["escritura", dataEscritura],
    ["obra", dataConclusaoObra],
  ];
  const ativos = datas
    .flatMap(([tipo, data]) => (data && mesDaData(data) >= atual ? [{ tipo, data, mes: mesDaData(data) }] : []))
    .sort((a, b) => a.data.localeCompare(b.data));
  const mesDoMarco = new Map<Marco, string>(ativos.map((a) => [a.tipo, a.mes]));
  const mesFim = ativos.at(-1)?.mes ?? null;

  // O horizonte vai até ao mês mais tarde entre o último marco e as despesas por pagar
  // (as dos marcos contam no mês do marco). Sem marcos, pelo menos 6 meses.
  let ultimo: string = mesFim ?? somarMeses(atual, mesesMinimos - 1);
  for (const d of porPagar) {
    const marco = marcoDe(d);
    if (marco && mesDoMarco.has(marco)) continue;
    if (d.mes > ultimo) ultimo = d.mes;
  }

  const fluxoPorMes = new Map(fluxos.map((f) => [f.mes, f]));
  const meses: MesPrevisao[] = [];
  for (let k = atual; k <= ultimo && meses.length < MESES_MAXIMOS; k = somarMeses(k, 1)) {
    const f = fluxoPorMes.get(k);
    meses.push({
      mes: k,
      marcos: ativos.filter((a) => a.mes === k).map((a) => a.tipo),
      saidas: 0,
      atrasadas: 0,
      nosMarcos: 0,
      entradasPrevistas: f ? arred(f.entradas.base) : 0,
      saidasPrevistas: f ? arred(f.saidas.base) : 0,
      saldo: null,
      saldoOtimista: null,
      saldoPessimista: null,
    });
  }
  const porMes = new Map(meses.map((m) => [m.mes as string, m]));
  const porMarco = new Map<Marco, number>();
  const depois = { n: 0, valor: 0 };
  for (const d of porPagar) {
    const marco = marcoDe(d);
    const mesMarco = marco ? mesDoMarco.get(marco) : undefined;
    if (marco && mesMarco) {
      // Conta sempre no mês do marco, seja qual for o mês guardado.
      const alvo = porMes.get(mesMarco);
      if (!alvo) continue; // para lá do limite de 36 meses
      alvo.saidas += d.valor;
      alvo.nosMarcos += d.valor;
      porMarco.set(marco, (porMarco.get(marco) ?? 0) + d.valor);
      continue;
    }
    const atrasada = d.mes < atual;
    const alvo = porMes.get(atrasada ? atual : d.mes);
    if (!alvo) {
      if (d.mes > (meses.at(-1)?.mes ?? atual)) {
        depois.n++;
        depois.valor += d.valor;
      }
      continue; // para lá do limite de 36 meses
    }
    alvo.saidas += d.valor;
    if (atrasada) alvo.atrasadas += d.valor;
  }

  const saldosMarco = new Map<Marco, { antes: Intervalo; depois: Intervalo }>();
  const saldo = { base: disponivel, otimista: disponivel, pessimista: disponivel };
  for (const m of meses) {
    m.saidas = arred(m.saidas);
    m.atrasadas = arred(m.atrasadas);
    m.nosMarcos = arred(m.nosMarcos);
    if (saldo.base == null) continue;
    const f = fluxoPorMes.get(m.mes);
    for (const c of CENARIOS) {
      const liquido = f ? f.entradas[c] - f.saidas[c] : 0;
      saldo[c] = arred(saldo[c]! + liquido - m.saidas);
    }
    // Saldo antes dos marcos do mês e depois de cada um, pela ordem das datas.
    let corrente = somarIntervalo({ base: saldo.base, otimista: saldo.otimista!, pessimista: saldo.pessimista! }, m.nosMarcos);
    for (const tipo of m.marcos) {
      const apos = somarIntervalo(corrente, -(porMarco.get(tipo) ?? 0));
      saldosMarco.set(tipo, { antes: corrente, depois: apos });
      corrente = apos;
    }
    m.saldo = saldo.base;
    m.saldoOtimista = saldo.otimista;
    m.saldoPessimista = saldo.pessimista;
  }

  const soma = (l: readonly DespesaPrevisao[]) => arred(l.reduce((s, d) => s + d.valor, 0));
  const ultimoMes = meses[meses.length - 1];
  const resumo: ResumoPrevisao = {
    disponivel,
    porPagar: soma(porPagar),
    nPorPagar: porPagar.length,
    pago: soma(pagas),
    nPagas: pagas.length,
    saldoFinal: ultimoMes ? ultimoMes.saldo : disponivel,
    estado: "ok",
    mesAlerta: null,
    saldoMinimo: null,
  };

  if (disponivel == null) resumo.estado = "sem-saldos";
  else {
    const saldos = meses.filter((m): m is MesPrevisao & { saldo: number } => m.saldo != null);
    const neg = saldos.find((m) => m.saldo < 0);
    const baixo = reserva > 0 ? saldos.find((m) => m.saldo < reserva) : undefined;
    const temSaidas = meses.some((m) => m.saidas > 0);
    if (neg) {
      resumo.estado = "falta";
      resumo.mesAlerta = neg.mes;
    } else if (baixo) {
      resumo.estado = "abaixo-reserva";
      resumo.mesAlerta = baixo.mes;
    } else {
      resumo.estado = temSaidas ? "ok" : "nada-por-pagar";
      resumo.saldoMinimo = saldos.length ? Math.min(...saldos.map((m) => m.saldo)) : null;
    }
  }

  const marcos: ResultadoMarco[] = ativos.map((a) => {
    const deste = despesas.filter((d) => marcoDe(d) === a.tipo);
    const porPagarM = deste.filter((d) => d.estado !== "pago");
    const pagasM = deste.filter((d) => d.estado === "pago");
    const s = saldosMarco.get(a.tipo);
    return {
      ...a,
      antes: s?.antes ?? null,
      depois: s?.depois ?? null,
      porPagar: soma(porPagarM),
      nPorPagar: porPagarM.length,
      pago: soma(pagasM),
      nPagas: pagasM.length,
    };
  });
  const totalNosMarcos = meses.reduce((s, x) => s + x.nosMarcos, 0);
  const ateFim = meses.filter((x) => mesFim != null && x.mes <= mesFim);

  return {
    mesAtual: atual,
    meses,
    resumo,
    reserva,
    marcos,
    escritura: marcos.find((m) => m.tipo === "escritura") ?? null,
    obra: marcos.find((m) => m.tipo === "obra") ?? null,
    fim: marcos.at(-1) ?? null,
    percurso: marcos.length
      ? {
          entradas: arred(ateFim.reduce((s, x) => s + x.entradasPrevistas, 0)),
          gastos: arred(ateFim.reduce((s, x) => s + x.saidasPrevistas, 0)),
          despesasCasa: arred(ateFim.reduce((s, x) => s + x.saidas, 0) - totalNosMarcos),
        }
      : null,
    depoisDoFim: { n: depois.n, valor: arred(depois.valor) },
    comFluxos: fluxos.length > 0,
  };
}
