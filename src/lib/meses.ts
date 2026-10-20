// Meses no formato "AAAA-MM". O mês atual conta sempre na hora de Lisboa,
// mesmo que o servidor esteja noutro fuso (o Railway corre em UTC).

export type Mes = `${number}-${number}`;

export const FUSO = "Europe/Lisbon";
const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function eMesValido(v: string): v is Mes {
  return RE_MES.test(v);
}

/** Mês de uma data na hora de Lisboa. */
export function mesDe(data: Date): Mes {
  // en-CA formata como "2026-10".
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit" }).format(data) as Mes;
}

export function somarMeses(mes: string, n: number): Mes {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  const ano = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${ano}-${String(mm).padStart(2, "0")}` as Mes;
}

const CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "dezembro de 2026" */
export function mesPorExtenso(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${LONGOS[m - 1]} de ${a}`;
}

/** "dez 26" (eixos dos gráficos e tabelas estreitas) */
export function mesCurto(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${CURTOS[m - 1]} ${String(a).slice(-2)}`;
}
