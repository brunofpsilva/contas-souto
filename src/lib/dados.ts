// Leituras partilhadas pelas páginas.
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { calcularDisponivel, marcarIncluidas } from "./contas";

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
  quem: string;
  estado: "previsto" | "pago";
  nota: string;
  criadoPor: string | null;
  criadoEm: Date;
  pagoPor: string | null;
  pagoEm: Date | null;
}

/** Todas as despesas, com os nomes de quem criou e de quem marcou como paga. */
export async function listarDespesas(): Promise<DespesaVista[]> {
  const [linhas, nomes] = await Promise.all([
    db.select().from(schema.despesas).orderBy(asc(schema.despesas.mes), asc(schema.despesas.id)),
    nomesUtilizadores(),
  ]);
  const nome = (email: string | null) => (email ? (nomes.get(email) ?? email) : null);
  return linhas.map((d) => ({
    id: d.id,
    descricao: d.descricao,
    valor: d.valor,
    mes: d.mes,
    categoria: d.categoria,
    quem: d.quem,
    estado: d.estado,
    nota: d.nota,
    criadoPor: nome(d.criadoPor),
    criadoEm: d.criadoEm,
    pagoPor: nome(d.pagoPor),
    pagoEm: d.pagoEm,
  }));
}
