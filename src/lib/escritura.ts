// Datas da escritura e da conclusão da obra: validação e formatos. As datas são texto "AAAA-MM-DD" e nunca
// passam por new Date("AAAA-MM-DD"), que as leria em UTC e podia mudar o dia.
import { cicloDoDia } from "./ciclo";
import type { Mes } from "./meses";

/** Datas em que se pagam despesas marcadas: a escritura e a conclusão da obra. */
export type Marco = "escritura" | "obra";

export const MARCOS: Record<Marco, { nome: string; titulo: string; depois: string }> = {
  escritura: { nome: "escritura", titulo: "Escritura", depois: "Depois da escritura" },
  obra: { nome: "conclusão da obra", titulo: "Conclusão da obra", depois: "Depois da obra" },
};

/** Datas guardadas nas definições (AAAA-MM-DD ou null). */
export interface DatasMarcos {
  dataEscritura: string | null;
  dataConclusaoObra: string | null;
}

/** Data do marco, a partir das datas guardadas. */
export function dataDoMarco(tipo: Marco, datas: DatasMarcos): string | null {
  return tipo === "escritura" ? datas.dataEscritura : datas.dataConclusaoObra;
}

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function eDataValida(v: string): boolean {
  const m = RE_DATA.exec(v);
  if (!m) return false;
  const [a, mm, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a < 2020 || a > 2100 || mm < 1 || mm > 12 || d < 1) return false;
  const diasNoMes = new Date(Date.UTC(a, mm, 0)).getUTCDate();
  return d <= diasNoMes;
}

/** Ciclo do salário em que cai a data (a partir do dia do salário já é o ciclo seguinte). */
export function mesDaData(data: string): Mes {
  return cicloDoDia(data);
}

/** "12 dez 2026" */
export function dataCurta(data: string): string {
  const [a, m, d] = data.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** Vazio apaga a data (null). */
export function validarDataEscritura(entrada: unknown): { ok: true; data: string | null } | { ok: false; erro: string } {
  const data = String(entrada ?? "").trim();
  if (!data) return { ok: true, data: null };
  if (!eDataValida(data)) return { ok: false, erro: "Escolhe uma data válida (AAAA-MM-DD)." };
  return { ok: true, data };
}
