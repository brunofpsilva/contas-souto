// Ciclos do orçamento: cada "mês" começa no dia do salário e acaba na véspera do seguinte.
// O Wallet não deixa mudar o início do mês, por isso o Rui e a Ana datam os movimentos
// dos últimos dias no dia 1 do mês seguinte e escrevem a data verdadeira na nota ("26/9 - ...").
// Assim, o mês de um movimento no Wallet já é o ciclo; a data verdadeira só serve para saber
// em que dia do ciclo foi gasto.
//
// O salário cai no dia 26, ou no dia útil anterior se for fim de semana; o de dezembro
// (que abre o ciclo de janeiro) cai no dia 23. Datas sempre como texto "AAAA-MM-DD".

import { diaDe, somarMeses, type Mes } from "./meses";

const DIA_SALARIO = 26;
const DIA_SALARIO_DEZEMBRO = 23;
const DIA_MS = 86_400_000;

const utc = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const texto = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function somarDias(dia: string, n: number): string {
  return texto(utc(dia) + n * DIA_MS);
}

/** Dias de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((utc(ate) - utc(de)) / DIA_MS);
}

/** Primeiro dia do ciclo `mes`: o dia do salário no mês anterior. */
export function inicioCiclo(mes: string): string {
  const anterior = somarMeses(mes, -1);
  const dia = anterior.endsWith("-12") ? DIA_SALARIO_DEZEMBRO : DIA_SALARIO;
  let ms = utc(`${anterior}-${String(dia).padStart(2, "0")}`);
  // Fim de semana: recua para sexta-feira.
  while ([0, 6].includes(new Date(ms).getUTCDay())) ms -= DIA_MS;
  return texto(ms);
}

/** Último dia do ciclo `mes` (véspera do salário seguinte). */
export function fimCiclo(mes: string): string {
  return somarDias(inicioCiclo(somarMeses(mes, 1)), -1);
}

/** Ciclo de um dia "AAAA-MM-DD". */
export function cicloDoDia(dia: string): Mes {
  const mes = dia.slice(0, 7) as Mes;
  return dia >= inicioCiclo(somarMeses(mes, 1)) ? somarMeses(mes, 1) : mes;
}

/** Ciclo de uma data, na hora de Lisboa. */
export function cicloDe(data: Date): Mes {
  return cicloDoDia(diaDe(data));
}

const RE_DATA_NOTA = /^\s*(\d{1,2})\/(\d{1,2})(?!\d|\/\d)/;

/**
 * Dia em que o movimento aconteceu: a data da nota ("25/9 - Raquete"), se for plausível
 * para o ciclo do movimento; senão, o dia do registo no Wallet.
 */
export function diaReal(m: { mes: string; data: Date; nota: string }): string {
  const registo = diaDe(m.data);
  const r = RE_DATA_NOTA.exec(m.nota);
  if (!r) return registo;
  const dia = Number(r[1]);
  const mm = Number(r[2]);
  if (mm < 1 || mm > 12 || dia < 1 || dia > 31) return registo;
  const ano = Number(m.mes.slice(0, 4));
  const inicio = somarDias(inicioCiclo(m.mes), -10);
  const fim = somarDias(fimCiclo(m.mes), 10);
  for (const a of [ano, ano - 1]) {
    const d = `${a}-${String(mm).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    if (d.slice(5) === texto(utc(d)).slice(5) && d >= inicio && d <= fim) return d;
  }
  return registo;
}
