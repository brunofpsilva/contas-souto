// Formatos pt-PT: "1 234,56 €" (o pt-PT, por defeito, não agrupa milhares com 4 dígitos).
import { MARCOS } from "./escritura";
import { mesPorExtenso } from "./meses";
import type { Previsao, ResumoPrevisao } from "./previsao";

const EUR = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", useGrouping: "always" });
const EUR_INTEIRO = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
  maximumFractionDigits: 0,
});

export function euros(v: number | null | undefined, { inteiro = false } = {}): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return (inteiro ? EUR_INTEIRO : EUR).format(v);
}

const DATA_HORA = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function dataHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return DATA_HORA.format(typeof d === "string" ? new Date(d) : d);
}

export type TomEstado = "ok" | "aviso" | "mau" | "neutro";

/**
 * Frase do estado geral, como na versão antiga. Com `p`, se o alerta vem dos pagamentos
 * de um marco (o saldo só fica abaixo do limite depois dele), diz "na escritura" ou
 * "na conclusão da obra" em vez do mês.
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
    if (culpado) quando = `na ${MARCOS[culpado.tipo].nome}`;
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
