// Formatos pt-PT (docs/redesenho-ux.md, secção 6): um formato de moeda, um sinal de menos
// e duas datas (curta "12 dez", longa "dezembro de 2026").
import { MARCOS } from "./escritura";
import { MESES_CURTOS, mesPorExtenso } from "./meses";
import type { Previsao, ResumoPrevisao } from "./previsao";

// O pt-PT, por defeito, não agrupa milhares com 4 dígitos: "1 234,56 €" pede useGrouping.
const EUR = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", useGrouping: "always" });
const EUR_INTEIRO = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
  maximumFractionDigits: 0,
});

/** O sinal de menos tipográfico (U+2212), o único usado na app. */
const MENOS = "−";

/**
 * "1 234,56 €". `inteiro` arredonda ao euro (totais, previsão, orçamento); `sinal` põe "+"
 * nos positivos (parcelas da previsão). Sem valor mostra um travessão.
 */
export function euros(v: number | null | undefined, { inteiro = false, sinal = false } = {}): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const arredondado = inteiro ? Math.round(v) : Math.round(v * 100) / 100;
  const texto = (inteiro ? EUR_INTEIRO : EUR).format(Math.abs(arredondado));
  if (arredondado < 0) return MENOS + texto;
  return sinal && arredondado > 0 ? `+${texto}` : texto;
}

const PARTES_DATA_HORA = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "10 nov, 09:14", na hora de Lisboa. */
export function dataHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const p = Object.fromEntries(PARTES_DATA_HORA.formatToParts(typeof d === "string" ? new Date(d) : d).map((x) => [x.type, x.value]));
  return `${Number(p.day)} ${MESES_CURTOS[Number(p.month) - 1]}, ${p.hour}:${p.minute}`;
}

/** Primeira letra em maiúscula ("dezembro de 2026" → "Dezembro de 2026"). */
export function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "1 despesa", "3 despesas". */
export function plural(n: number, singular: string, variosTexto = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : variosTexto}`;
}

export type TomEstado = "ok" | "aviso" | "mau" | "neutro";

/**
 * Frase do estado geral, como na versão antiga. Com `p`, se o alerta vem dos pagamentos
 * de um marco (o saldo só fica abaixo do limite depois dele), diz "na escritura" ou
 * "no fim da obra" em vez do mês.
 */
export function textoEstado(
  r: ResumoPrevisao,
  p?: Pick<Previsao, "marcos" | "reserva">,
): { texto: string; tom: TomEstado; /** O valor no fim do texto, para o poder esconder. */ valor?: string } {
  let quando = `em ${mesPorExtenso(r.mesAlerta ?? "")}`;
  const limite = r.estado === "falta" ? 0 : (p?.reserva ?? 0);
  const doMes = p?.marcos.filter((m) => m.mes === r.mesAlerta) ?? [];
  if (doMes[0]?.antes && doMes[0].antes.base >= limite) {
    const culpado = doMes.find((m) => m.depois && m.depois.base < limite);
    if (culpado) quando = MARCOS[culpado.tipo].em;
  }
  switch (r.estado) {
    case "falta":
      return { texto: `Falta dinheiro ${quando}`, tom: "mau" };
    case "abaixo-reserva":
      return { texto: `Abaixo da reserva ${quando}`, tom: "aviso" };
    case "ok": {
      const valor = euros(r.saldoMinimo, { inteiro: true });
      return { texto: `Chega para tudo · mínimo ${valor}`, tom: "ok", valor };
    }
    case "nada-por-pagar":
      return { texto: "Nada por pagar", tom: "neutro" };
    case "sem-saldos":
      return { texto: "Sem saldos do Wallet", tom: "neutro" };
  }
}
