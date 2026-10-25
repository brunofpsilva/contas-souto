// Previsão do dia a dia a partir dos movimentos reais do Wallet (função pura, testada).
//
// Método (simples de explicar):
// - Cada mês é um ciclo do salário (ver ciclo.ts); o mês dos movimentos no Wallet já é o ciclo.
// - Janela: os últimos 12 ciclos completos. Sem transferências e sem as despesas pontuais da casa.
// - Salários: valor fixo (tendencia-regras.ts). Outros rendimentos e renda: mediana dos ciclos.
// - Gastos do dia a dia: mediana dos ciclos da janela, igual em todos os ciclos futuros. Cada
//   ciclo pode ter um valor escrito à mão para gastos e renda, que substitui a previsão automática.
// - Picos (uma categoria muito acima do habitual num ciclo do último ano) não mudam os números:
//   servem para avisar de possíveis gastos no mesmo ciclo deste ano.
// - Subsídios de Natal e de férias, bónus e reembolso do IRS repetem-se uma vez por ano:
//   entram no mesmo mês do ano passado, com o mesmo valor.
// - No ciclo atual só conta o que ainda falta entrar ou sair (o disponível já inclui o resto).
//   Os gastos do dia a dia que faltam são a mediana do que se gastou, nos ciclos da janela,
//   nos mesmos últimos dias do ciclo (pela data verdadeira, que pode estar na nota).
// - Os cenários otimista/pessimista continuam calculados mas a página já não os mostra.

import { cicloDe, diaReal, diasEntre, fimCiclo, inicioCiclo, somarDias } from "./ciclo";
import { diaDe, somarMeses, type Mes } from "./meses";
import type { FluxoMes, Intervalo } from "./previsao";
import { REGRAS, type RegrasTendencia } from "./tendencia-regras";

export interface MovimentoTendencia {
  mes: string;
  valor: number;
  moeda?: string;
  categoriaId: string | null;
  categoriaPaiId?: string | null;
  categoriaNome?: string;
  grupo: string;
  nota: string;
  transferencia: boolean;
  /** Data do registo no Wallet (para saber em que dia do ciclo foi gasto). */
  data?: Date;
}

export interface CicloAtual {
  mes: Mes;
  /** "AAAA-MM-DD" */
  inicio: string;
  fim: string;
  /** Dias que faltam, contando com hoje. */
  diasQueFaltam: number;
  /** Gastos do dia a dia que ainda se esperam neste ciclo (mediana da coluna abaixo). */
  gastosQueFaltam: number;
  /** Quanto se gastou em cada ciclo da janela nos mesmos últimos dias. */
  porCiclo: { mes: Mes; valor: number }[];
  /** Já gasto neste ciclo, por categoria (para não avisar do que já aconteceu). */
  gastoPorCategoria: Record<string, number>;
}

export type IdComponente = "salarios" | "rendimentos" | "gastos" | "renda";
export type TipoAnual = "subsidio" | "bonus" | "irs";

export interface Componente {
  id: IdComponente;
  nome: string;
  sentido: "entrada" | "saida";
  /** Total de cada mês da janela, sempre positivo para o sentido do componente. */
  valores: { mes: Mes; valor: number }[];
  valor: Intervalo;
  regra: string;
  /** Já entrou/saiu no mês atual. */
  realizadoMesAtual: number;
  /** Categorias com mais peso (só para explicar). */
  categorias: { nome: string; mediana: number }[];
}

export interface RendimentoAnual {
  tipo: TipoAnual;
  nome: string;
  /** Mês em que entrou no último ano. */
  mesOrigem: Mes;
  valor: number;
  pessimista: number;
}

/** Pico de uma categoria num ciclo do último ano: aviso de um possível gasto no mesmo ciclo. */
export interface GastoDoMes {
  nome: string;
  mesOrigem: Mes;
  /** O que se gastou nesse ciclo. */
  total: number;
  /** O habitual da categoria (mediana dos ciclos). */
  habitual: number;
}

/** Gastos do dia a dia e renda de um ciclo da previsão. */
export interface GastoCiclo {
  mes: Mes;
  /** Previsão automática (no ciclo atual, o que ainda falta). */
  automatico: number;
  /** Valor escrito à mão, se houver. */
  editado: number | null;
}

export interface Tendencia {
  mesAtual: Mes;
  cicloAtual: CicloAtual;
  picos: GastoDoMes[];
  gastosPorCiclo: GastoCiclo[];
  janela: { de: Mes; ate: Mes };
  componentes: Componente[];
  anuais: RendimentoAnual[];
  /** Entradas e saídas esperadas a partir do mês atual (vazio se não há movimentos). */
  fluxos: FluxoMes[];
  /** Saldo líquido de um mês normal (sem anuais). */
  liquidoMensal: Intervalo;
  avisos: string[];
}

type Classe = { componente: IdComponente } | { anual: TipoAnual } | null;

const arred = (v: number) => Math.round(v * 100) / 100;
const ordenar = (v: number[]) => [...v].sort((a, b) => a - b);

export function mediana(v: number[]): number {
  if (!v.length) return 0;
  const o = ordenar(v);
  const m = Math.floor(o.length / 2);
  return arred(o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2);
}

/** 2.º mais baixo (ou o mais baixo, com menos de 3 valores). */
function segundoMaisBaixo(v: number[]): number {
  const o = ordenar(v);
  return o.length >= 3 ? o[1] : (o[0] ?? 0);
}

function segundoMaisAlto(v: number[]): number {
  const o = ordenar(v);
  return o.length >= 3 ? o[o.length - 2] : (o[o.length - 1] ?? 0);
}

export function classificar(m: MovimentoTendencia, r: RegrasTendencia = REGRAS): Classe {
  if (m.transferencia) return null;
  if ((m.moeda ?? "EUR") !== "EUR") return null;
  const cat = m.categoriaId ?? "";
  const pai = m.categoriaPaiId ?? "";
  if (r.categoriasExcluidas.includes(cat) || r.categoriasExcluidas.includes(pai)) return null;
  const e = (id: string) => cat === id || pai === id;

  if (m.grupo === r.grupoRendimentos) {
    if (e(r.categoriaSalario)) return r.notaBonus.test(m.nota) ? { anual: "bonus" } : { componente: "salarios" };
    if (e(r.categoriaSubsidio) && r.notaSubsidioAnual.test(m.nota)) return { anual: "subsidio" };
    if (e(r.categoriaReembolso) && r.notaIrs.test(m.nota)) return { anual: "irs" };
    return { componente: "rendimentos" };
  }
  if (r.categoriasRenda.some(e)) return { componente: "renda" };
  return { componente: "gastos" };
}

const NOMES: Record<IdComponente, { nome: string; sentido: "entrada" | "saida" }> = {
  salarios: { nome: "Salários", sentido: "entrada" },
  rendimentos: { nome: "Outros rendimentos", sentido: "entrada" },
  gastos: { nome: "Gastos do dia a dia", sentido: "saida" },
  renda: { nome: "Renda", sentido: "saida" },
};

function nomeAnual(tipo: TipoAnual, nota: string): string {
  if (tipo === "bonus") return "Bónus";
  if (tipo === "irs") return "Reembolso do IRS";
  return /natal/i.test(nota) ? "Subsídio de Natal" : "Subsídio de férias";
}

function intervaloDe(id: IdComponente, valores: number[], r: RegrasTendencia): { valor: Intervalo; regra: string } {
  if (id === "salarios" && r.salariosFixos.length) {
    const total = arred(r.salariosFixos.reduce((s, x) => s + x.valor, 0));
    return {
      valor: { base: total, otimista: total, pessimista: total },
      regra: `Fixo: ${r.salariosFixos.map((x) => `${x.nome} ${x.valor.toLocaleString("pt-PT", { minimumFractionDigits: x.valor % 1 ? 2 : 0 })} €`).join(" + ")}.`,
    };
  }
  if (id === "salarios") {
    return {
      valor: { base: segundoMaisBaixo(valores), otimista: mediana(valores), pessimista: arred(Math.min(...valores, Infinity) || 0) },
      regra: "2.º mês mais baixo (um mês normal).",
    };
  }
  if (id === "rendimentos") {
    return {
      valor: { base: mediana(valores), otimista: segundoMaisAlto(valores), pessimista: segundoMaisBaixo(valores) },
      regra: "Mediana dos ciclos.",
    };
  }
  return {
    valor: { base: mediana(valores), otimista: segundoMaisBaixo(valores), pessimista: segundoMaisAlto(valores) },
    regra: "Mediana dos ciclos.",
  };
}

// Um pico é um ciclo em que a categoria passou de 100 € e de duas vezes o habitual + 50 €.
const PICO_MINIMO = 100;
const PICO_VEZES = 2;
const PICO_FOLGA = 50;

/** Picos de cada categoria nos ciclos da janela (gastos positivos por categoria e ciclo). */
export function picosDeGastos(porCategoria: ReadonlyMap<string, ReadonlyMap<string, number>>, meses: readonly Mes[]): GastoDoMes[] {
  const picos: GastoDoMes[] = [];
  for (const [nome, porMes] of porCategoria) {
    const valores = meses.map((mes) => porMes.get(mes) ?? 0);
    const h = mediana(valores);
    meses.forEach((mes, i) => {
      const v = valores[i];
      if (v > PICO_MINIMO && v > PICO_VEZES * h + PICO_FOLGA) picos.push({ nome, mesOrigem: mes, total: arred(v), habitual: h });
    });
  }
  return picos.sort((a, b) => a.mesOrigem.localeCompare(b.mesOrigem) || b.total - a.total);
}

/** Picos do mesmo ciclo do ano passado: possíveis gastos neste ciclo. */
export function picosDoCiclo(picos: readonly GastoDoMes[], mes: string): GastoDoMes[] {
  return picos.filter((p) => p.mesOrigem.slice(5) === mes.slice(5));
}

export function calcularTendencia({
  movimentos,
  hoje = new Date(),
  meses = 36,
  regras = REGRAS,
  gastosEditados = new Map(),
}: {
  movimentos: readonly MovimentoTendencia[];
  hoje?: Date;
  meses?: number;
  regras?: RegrasTendencia;
  /** Ciclo AAAA-MM -> gastos do dia a dia escritos à mão. */
  gastosEditados?: ReadonlyMap<string, number>;
}): Tendencia {
  const atual = cicloDe(hoje);
  const fim = fimCiclo(atual);
  const diasQueFaltam = Math.max(1, diasEntre(diaDe(hoje), fim) + 1);
  const de = somarMeses(atual, -regras.mesesJanela);
  const ate = somarMeses(atual, -1);
  const mesesJanela: Mes[] = [];
  for (let k = de; k <= ate; k = somarMeses(k, 1)) mesesJanela.push(k);
  // Em cada ciclo da janela, o primeiro dia dos "mesmos últimos dias" que faltam agora.
  const limiteFinal = new Map(mesesJanela.map((k) => [k as string, somarDias(fimCiclo(k), -(diasQueFaltam - 1))]));
  const gastosFinais = new Map<string, number>();
  const gastoAtualPorCategoria = new Map<string, number>();
  const inicioAnual = somarMeses(atual, -12);

  // Totais por componente e mês (com sinal), anuais e o que já aconteceu no mês atual.
  const totais = new Map<IdComponente, Map<string, number>>();
  const porCategoria = new Map<IdComponente, Map<string, Map<string, number>>>();
  const anuais: RendimentoAnual[] = [];
  const realizado = new Map<IdComponente | TipoAnual, number>();
  let semCategoria = 0;
  let totalJanela = 0;
  const mesesComDados = new Set<string>();

  for (const m of movimentos) {
    const c = classificar(m, regras);
    if (!c) continue;
    if (m.mes >= de && m.mes <= ate) {
      mesesComDados.add(m.mes);
      totalJanela += Math.abs(m.valor);
      if (!m.categoriaId || m.grupo === "unknown_records") semCategoria += Math.abs(m.valor);
    }
    if ("anual" in c) {
      if (m.mes === atual) realizado.set(c.anual, (realizado.get(c.anual) ?? 0) + m.valor);
      else if (m.mes >= inicioAnual && m.mes < atual) {
        const existente = anuais.find((a) => a.tipo === c.anual && a.mesOrigem === m.mes);
        if (existente) existente.valor = arred(existente.valor + m.valor);
        else anuais.push({ tipo: c.anual, nome: nomeAnual(c.anual, m.nota), mesOrigem: m.mes as Mes, valor: m.valor, pessimista: 0 });
      }
      continue;
    }
    const id = c.componente;
    if (m.mes === atual) {
      realizado.set(id, (realizado.get(id) ?? 0) + m.valor);
      if (id === "gastos") {
        const nome = m.categoriaNome || "Sem categoria";
        gastoAtualPorCategoria.set(nome, (gastoAtualPorCategoria.get(nome) ?? 0) - m.valor);
      }
    }
    if (m.mes < de || m.mes > ate) continue;
    if (id === "gastos" && m.data && diaReal({ mes: m.mes, data: m.data, nota: m.nota }) >= limiteFinal.get(m.mes)!) {
      gastosFinais.set(m.mes, (gastosFinais.get(m.mes) ?? 0) - m.valor);
    }
    const t = totais.get(id) ?? new Map<string, number>();
    t.set(m.mes, (t.get(m.mes) ?? 0) + m.valor);
    totais.set(id, t);
    const pc = porCategoria.get(id) ?? new Map<string, Map<string, number>>();
    const nome = m.categoriaNome || "Sem categoria";
    const cm = pc.get(nome) ?? new Map<string, number>();
    cm.set(m.mes, (cm.get(m.mes) ?? 0) + m.valor);
    pc.set(nome, cm);
    porCategoria.set(id, pc);
  }

  for (const a of anuais) {
    a.valor = arred(a.valor);
    a.pessimista = a.tipo === "subsidio" ? a.valor : 0;
  }
  anuais.sort((a, b) => a.mesOrigem.localeCompare(b.mesOrigem) || a.tipo.localeCompare(b.tipo));

  const sinal = (id: IdComponente) => (NOMES[id].sentido === "entrada" ? 1 : -1);
  const componentes: Componente[] = (Object.keys(NOMES) as IdComponente[])
    .filter((id) => totais.has(id))
    .map((id) => {
      const t = totais.get(id)!;
      const valores = mesesJanela.map((mes) => ({ mes, valor: arred(sinal(id) * (t.get(mes) ?? 0)) }));
      const { valor, regra } = intervaloDe(
        id,
        valores.map((v) => v.valor),
        regras,
      );
      const categorias = [...(porCategoria.get(id) ?? new Map()).entries()]
        .map(([nome, cm]) => ({ nome, mediana: mediana(mesesJanela.map((mes) => sinal(id) * (cm.get(mes) ?? 0))) }))
        .filter((c) => c.mediana > 0)
        .sort((a, b) => b.mediana - a.mediana)
        .slice(0, 6);
      return {
        id,
        ...NOMES[id],
        valores,
        valor,
        regra,
        realizadoMesAtual: arred(Math.max(0, sinal(id) * (realizado.get(id) ?? 0))),
        categorias,
      };
    });

  // Picos por categoria: só para avisos.
  const gastosPorCategoria = new Map(
    [...(porCategoria.get("gastos") ?? new Map<string, Map<string, number>>()).entries()].map(([nome, cm]) => [
      nome,
      new Map([...cm.entries()].map(([mes, v]) => [mes, -v])),
    ]),
  );
  const picos = picosDeGastos(gastosPorCategoria, mesesJanela);
  const cg = componentes.find((c) => c.id === "gastos");
  const cr = componentes.find((c) => c.id === "renda");

  const avisos: string[] = [];
  if (!movimentos.length) avisos.push("Ainda não há movimentos do Wallet: sincroniza para ver a previsão do dia a dia.");
  else if (mesesComDados.size < regras.mesesJanela)
    avisos.push(`Só há movimentos em ${mesesComDados.size} dos últimos ${regras.mesesJanela} meses: a previsão é menos fiável.`);
  if (totalJanela > 0 && semCategoria / totalJanela > 0.05)
    avisos.push(`${Math.round((semCategoria / totalJanela) * 100)} % dos movimentos não têm categoria no Wallet.`);
  if (!componentes.some((c) => c.id === "salarios") && movimentos.length)
    avisos.push("Não há salários nos últimos meses: confirma a categoria Salários no Wallet.");

  const zero: Intervalo = { base: 0, otimista: 0, pessimista: 0 };
  const cenarios = ["base", "otimista", "pessimista"] as const;
  const liquidoMensal = { ...zero };
  for (const c of componentes) for (const k of cenarios) liquidoMensal[k] = arred(liquidoMensal[k] + (c.sentido === "entrada" ? 1 : -1) * c.valor[k]);

  const porCiclo = mesesJanela.map((mes) => ({ mes, valor: arred(gastosFinais.get(mes) ?? 0) }));
  const inicio = inicioCiclo(atual);
  // No primeiro dia do ciclo falta o ciclo inteiro: conta como os seguintes.
  const gastosCiclo = cg?.valor.base ?? 0;
  const cicloAtual: CicloAtual = {
    mes: atual,
    inicio,
    fim,
    diasQueFaltam,
    gastosQueFaltam: diaDe(hoje) <= inicio ? gastosCiclo : mediana(porCiclo.map((c) => c.valor)),
    porCiclo,
    gastoPorCategoria: Object.fromEntries([...gastoAtualPorCategoria].map(([k, v]) => [k, arred(v)])),
  };

  const fluxos: FluxoMes[] = [];
  const gastosPorCiclo: GastoCiclo[] = [];
  if (movimentos.length) {
    for (let i = 0, k = atual; i < meses; i++, k = somarMeses(k, 1)) {
      const entradas = { ...zero };
      const saidas = { ...zero };
      // O valor editado substitui os gastos do dia a dia e a renda do ciclo.
      const gastosAuto = k === atual ? cicloAtual.gastosQueFaltam : gastosCiclo;
      const rendaAuto = cr ? (k === atual ? Math.max(0, cr.valor.base - cr.realizadoMesAtual) : cr.valor.base) : 0;
      const automatico = arred(gastosAuto + rendaAuto);
      const editado = gastosEditados.get(k) ?? null;
      if (cg || cr) gastosPorCiclo.push({ mes: k, automatico, editado });
      for (const c of componentes) {
        const alvo = c.sentido === "entrada" ? entradas : saidas;
        for (const e of cenarios) {
          let v = c.valor[e];
          if (c.id === "gastos") v = editado ?? gastosAuto;
          else if (c.id === "renda") v = editado != null ? 0 : rendaAuto;
          else if (k === atual) v = Math.max(0, v - c.realizadoMesAtual);
          alvo[e] += v;
        }
      }
      const mesDoAno = k.slice(5);
      for (const tipo of ["subsidio", "bonus", "irs"] as const) {
        const doMes = anuais.filter((a) => a.tipo === tipo && a.mesOrigem.slice(5) === mesDoAno);
        if (!doMes.length) continue;
        const ja = k === atual ? Math.max(0, realizado.get(tipo) ?? 0) : 0;
        const valor = doMes.reduce((s, a) => s + a.valor, 0);
        const pess = doMes.reduce((s, a) => s + a.pessimista, 0);
        entradas.base += Math.max(0, valor - ja);
        entradas.otimista += Math.max(0, valor - ja);
        entradas.pessimista += Math.max(0, pess - ja);
      }
      for (const e of cenarios) {
        entradas[e] = arred(entradas[e]);
        saidas[e] = arred(saidas[e]);
      }
      fluxos.push({ mes: k, entradas, saidas });
    }
  }

  return { mesAtual: atual, cicloAtual, picos, gastosPorCiclo, janela: { de, ate }, componentes, anuais, fluxos, liquidoMensal, avisos };
}
