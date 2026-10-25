// Leituras partilhadas pelas páginas.
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { calcularDisponivel, marcarIncluidas } from "./contas";
import type { DatasMarcos } from "./escritura";
import type { DivisaoOrcamento } from "./orcamento";
import { calcularTendencia, type Tendencia } from "./tendencia";

export async function obterDefinicoes() {
  const [d] = await db.select().from(schema.definicoes).limit(1);
  if (d) return d;
  const [nova] = await db.insert(schema.definicoes).values({ id: 1 }).onConflictDoNothing().returning();
  return nova ?? (await db.select().from(schema.definicoes).limit(1))[0];
}

export async function obterContas() {
  const [contas, definicoes] = await Promise.all([
    db.select().from(schema.contas).orderBy(asc(schema.contas.nome)),
    obterDefinicoes(),
  ]);
  const comSelecao = marcarIncluidas(contas, definicoes.contasEscolhidas);
  return {
    contas: comSelecao,
    disponivel: calcularDisponivel(comSelecao),
    escolhaManual: definicoes.contasEscolhidas != null,
    reserva: definicoes.reserva,
  };
}

/** Datas da escritura e da conclusão da obra. */
export async function obterDatas(): Promise<DatasMarcos> {
  const d = await obterDefinicoes();
  return { dataEscritura: d.dataEscritura, dataConclusaoObra: d.dataConclusaoObra };
}

/** Gastos do dia a dia escritos à mão, por ciclo. Sem a tabela (migração por aplicar) fica tudo automático. */
async function obterGastosEditados(): Promise<Map<string, number>> {
  try {
    const linhas = await db.select({ mes: schema.gastosEditados.mes, valor: schema.gastosEditados.valor }).from(schema.gastosEditados);
    return new Map(linhas.map((l) => [l.mes, l.valor]));
  } catch (e) {
    console.error("[gastos editados] Falta aplicar a migração 0004?", e);
    return new Map();
  }
}

/** Previsão do dia a dia a partir dos movimentos guardados na última sincronização. */
export async function obterTendencia(): Promise<Tendencia> {
  const m = schema.movimentos;
  const movimentos = await db
    .select({
      mes: m.mes,
      valor: m.valor,
      moeda: m.moeda,
      categoriaId: m.categoriaId,
      categoriaPaiId: m.categoriaPaiId,
      categoriaNome: m.categoriaNome,
      grupo: m.grupo,
      nota: m.nota,
      data: m.data,
      transferencia: m.transferencia,
    })
    .from(m);
  return calcularTendencia({ movimentos, gastosEditados: await obterGastosEditados() });
}

/** Divisões da casa, pela ordem em que foram criadas. */
export async function listarDivisoes(): Promise<DivisaoOrcamento[]> {
  const v = schema.divisoes;
  return db.select({ id: v.id, nome: v.nome, orcamento: v.orcamento }).from(v).orderBy(asc(v.id));
}

/** Mapa email -> nome, para mostrar quem fez o quê. */
export async function nomesUtilizadores(): Promise<Map<string, string>> {
  const linhas = await db.select({ email: schema.utilizadores.email, nome: schema.utilizadores.nome }).from(schema.utilizadores);
  return new Map(linhas.map((u) => [u.email, u.nome.split(" ")[0] || u.nome]));
}

export interface DespesaVista {
  id: number;
  descricao: string;
  valor: number;
  mes: string;
  categoria: string;
  estado: "previsto" | "pago";
  nota: string;
  naEscritura: boolean;
  naConclusaoObra: boolean;
  /** null = Não aplicável */
  divisaoId: number | null;
  divisao: string | null;
  criadoPor: string | null;
  criadoEm: Date;
  pagoPor: string | null;
  pagoEm: Date | null;
}

/** Todas as despesas, com a divisão e os nomes de quem criou e de quem marcou como paga. */
export async function listarDespesas(): Promise<DespesaVista[]> {
  const [linhas, nomes, divisoes] = await Promise.all([
    db.select().from(schema.despesas).orderBy(asc(schema.despesas.mes), asc(schema.despesas.id)),
    nomesUtilizadores(),
    listarDivisoes(),
  ]);
  const nomesDivisoes = new Map(divisoes.map((d) => [d.id, d.nome]));
  const nome = (email: string | null) => (email ? (nomes.get(email) ?? email) : null);
  return linhas.map((d) => ({
    id: d.id,
    descricao: d.descricao,
    valor: d.valor,
    mes: d.mes,
    categoria: d.categoria,
    estado: d.estado,
    nota: d.nota,
    naEscritura: d.naEscritura,
    naConclusaoObra: d.naConclusaoObra,
    divisaoId: d.divisaoId,
    divisao: d.divisaoId != null ? (nomesDivisoes.get(d.divisaoId) ?? null) : null,
    criadoPor: nome(d.criadoPor),
    criadoEm: d.criadoEm,
    pagoPor: nome(d.pagoPor),
    pagoEm: d.pagoEm,
  }));
}
