// Formatos pt-PT: "1 234,56 €" (o pt-PT, por defeito, não agrupa milhares com 4 dígitos).
import { mesPorExtenso } from "./meses";
import type { ResumoPrevisao } from "./previsao";

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

/** Frase do estado geral, como na versão antiga. */
export function textoEstado(r: ResumoPrevisao): { texto: string; tom: TomEstado } {
  switch (r.estado) {
    case "falta":
      return { texto: `Falta dinheiro em ${mesPorExtenso(r.mesAlerta!)}`, tom: "mau" };
    case "abaixo-reserva":
      return { texto: `Abaixo da reserva em ${mesPorExtenso(r.mesAlerta!)}`, tom: "aviso" };
    case "ok":
      return { texto: `Chega para tudo · mínimo ${euros(r.saldoMinimo, { inteiro: true })}`, tom: "ok" };
    case "nada-por-pagar":
      return { texto: "Nada por pagar", tom: "neutro" };
    case "sem-saldos":
      return { texto: "Sem saldos do Wallet", tom: "neutro" };
  }
}
