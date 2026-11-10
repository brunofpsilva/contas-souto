// O que o Início mostra: o estado, um número e uma linha de contexto (função pura, testada).
// Só escolhe e descreve valores que a previsão já calculou; não faz contas novas.
import { agruparPorMes, type DespesaAgrupavel } from "./agrupar";
import { dataCurta, MARCOS } from "./escritura";
import { maiuscula, textoEstado, type TomEstado } from "./formato";
import { mesLongo } from "./meses";
import type { Previsao } from "./previsao";

export interface ResumoInicio {
  tom: TomEstado;
  /** "Chega para tudo", "Falta dinheiro na escritura"… */
  titulo: string;
  /** O número grande: o saldo previsto no ponto que interessa. null sem saldos. */
  valor: number | null;
  /** Onde e quando: "depois da escritura · 12 dez", "no fim de abril de 2027". */
  contexto: string;
  /** No máximo uma linha extra, por exemplo "Reserva mínima" e o seu valor. */
  extra: { texto: string; valor: number } | null;
}

interface Ponto {
  valor: number;
  contexto: string;
}

/**
 * O número segue o estado. Quando chega, é o saldo depois do último marco (ou no fim da
 * previsão, sem marcos). Quando falta dinheiro ou fica abaixo da reserva, é o saldo no ponto
 * em que isso acontece, e o saldo do último marco passa para a linha extra.
 */
export function resumoInicio(p: Previsao, anoAtual?: number): ResumoInicio {
  const r = p.resumo;
  const { texto: titulo, tom } = textoEstado(r, p);
  const ultimoMes = p.meses.at(-1);
  if (r.estado === "sem-saldos" || !ultimoMes || ultimoMes.saldo == null) return { tom, titulo, valor: null, contexto: "", extra: null };

  const noFimDe = (mes: string) => `no fim de ${mesLongo(mes, anoAtual)}`;
  const fimPrevisao: Ponto = { valor: ultimoMes.saldo, contexto: noFimDe(ultimoMes.mes) };
  // O ponto final: depois do último marco, ou o fim da previsão se não houver marcos.
  const final: Ponto = p.fim?.depois
    ? { valor: p.fim.depois.base, contexto: `${MARCOS[p.fim.tipo].depois} · ${dataCurta(p.fim.data, anoAtual)}` }
    : fimPrevisao;
  // Com despesas depois do último marco, a previsão continua: esse saldo vai na linha extra.
  const continua = p.fim != null && ultimoMes.mes > p.fim.mes;
  const linhaFim = continua ? { texto: maiuscula(fimPrevisao.contexto), valor: fimPrevisao.valor } : null;

  if (r.estado !== "falta" && r.estado !== "abaixo-reserva") return { tom, titulo, ...final, extra: linhaFim };

  // O ponto do alerta: o marco que o provoca ou, se já vinha de antes, o fim desse mês.
  const limite = r.estado === "falta" ? 0 : p.reserva;
  const doMes = p.marcos.filter((m) => m.mes === r.mesAlerta);
  const culpado = doMes[0]?.antes && doMes[0].antes.base >= limite ? doMes.find((m) => m.depois && m.depois.base < limite) : undefined;
  const mesAlerta = p.meses.find((m) => m.mes === r.mesAlerta);
  const alerta: Ponto = culpado?.depois
    ? { valor: culpado.depois.base, contexto: `${MARCOS[culpado.tipo].depois} · ${dataCurta(culpado.data, anoAtual)}` }
    : { valor: mesAlerta?.saldo ?? final.valor, contexto: noFimDe(r.mesAlerta ?? ultimoMes.mes) };

  if (r.estado === "abaixo-reserva") return { tom, titulo, ...alerta, extra: { texto: "Reserva mínima", valor: p.reserva } };

  // Falta dinheiro antes do ponto final: mostra também como fica no fim.
  const noPontoFinal = alerta.contexto === final.contexto;
  const linhaFinal =
    !noPontoFinal && p.fim?.depois
      ? { texto: `${maiuscula(MARCOS[p.fim.tipo].depois)} (${dataCurta(p.fim.data, anoAtual)})`, valor: final.valor }
      : !noPontoFinal
        ? { texto: maiuscula(final.contexto), valor: final.valor }
        : linhaFim;
  return { tom, titulo, ...alerta, extra: linhaFinal };
}

/**
 * As próximas despesas por pagar: primeiro as atrasadas, depois por mês e, dentro do mês,
 * as de maior valor.
 */
export function proximosPagamentos<T extends DespesaAgrupavel>(despesas: readonly T[], mesAtual: string, quantas = 4) {
  const porPagar = despesas.filter((d) => d.estado !== "pago");
  return agruparPorMes(porPagar, mesAtual)
    .flatMap((g) => g.despesas)
    .slice(0, quantas);
}
