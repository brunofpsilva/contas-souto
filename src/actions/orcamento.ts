"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirUtilizador } from "@/lib/auth";
import { chaveNome, validarDivisoes, validarNomeDivisao, validarOrcamento } from "@/lib/validacao";
import type { EstadoAcao } from "./contas";

const v = schema.divisoes;

/** Nome já usado por outra divisão (sem contar maiúsculas e acentos)? */
async function nomeRepetido(nome: string): Promise<boolean> {
  const todas = await db.select({ nome: v.nome }).from(v);
  return todas.some((d) => chaveNome(d.nome) === chaveNome(nome));
}

/** Violação do índice único dos nomes (duas pessoas a gravar o mesmo nome ao mesmo tempo). */
function eNomeDuplicado(e: unknown): boolean {
  const codigo = (x: unknown) => (x && typeof x === "object" && "code" in x ? (x as { code: unknown }).code : undefined);
  return codigo(e) === "23505" || codigo((e as { cause?: unknown })?.cause) === "23505";
}

const resposta = (ok: boolean, mensagem: string): EstadoAcao => ({ ok, mensagem, quando: Date.now() });

export async function criarDivisao(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const nome = validarNomeDivisao(form.get("nome"));
  if (!nome.ok) return resposta(false, nome.erro);
  const orcamento = validarOrcamento(form.get("orcamento"));
  if (!orcamento.ok) return resposta(false, orcamento.erro);
  if (await nomeRepetido(nome.nome)) return resposta(false, `Já existe a divisão "${nome.nome}".`);

  try {
    await db.insert(v).values({ nome: nome.nome, orcamento: orcamento.valor, criadoPor: eu.email, atualizadoPor: eu.email });
  } catch (e) {
    if (eNomeDuplicado(e)) return resposta(false, `Já existe a divisão "${nome.nome}".`);
    throw e;
  }
  revalidatePath("/", "layout");
  return resposta(true, `Divisão "${nome.nome}" adicionada.`);
}

/** Guarda os nomes e os orçamentos de todas as divisões de uma vez. */
export async function guardarDivisoes(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const r = validarDivisoes(form.entries());
  if (!r.ok) return resposta(false, r.erro);

  const existentes = await db.select({ id: v.id, nome: v.nome }).from(v);
  const enviados = new Set(r.divisoes.map((d) => d.id));
  // Um nome novo não pode chocar com uma divisão que não veio no formulário (criada entretanto).
  for (const d of r.divisoes) {
    const outra = existentes.find((e) => !enviados.has(e.id) && chaveNome(e.nome) === chaveNome(d.nome));
    if (outra) return resposta(false, `Já existe a divisão "${outra.nome}".`);
  }

  const ids = new Set(existentes.map((e) => e.id));
  try {
    await db.transaction(async (tx) => {
      for (const d of r.divisoes) {
        if (!ids.has(d.id)) continue; // apagada entretanto
        await tx.update(v).set({ nome: d.nome, orcamento: d.orcamento, atualizadoPor: eu.email, atualizadoEm: new Date() }).where(eq(v.id, d.id));
      }
    });
  } catch (e) {
    // Trocar nomes entre duas divisões (A↔B) choca a meio; o mais simples é pedir em dois passos.
    if (eNomeDuplicado(e)) return resposta(false, "Dois nomes chocam entre si. Muda um de cada vez e guarda entre as mudanças.");
    throw e;
  }

  revalidatePath("/", "layout");
  return resposta(true, "Orçamento guardado.");
}

export type ResultadoApagar = { ok: true; mensagem: string } | { ok: false; mensagem: string };

/** Apaga a divisão; as despesas dela passam a Não aplicável (a BD põe divisao_id a null). */
export async function apagarDivisao(id: number): Promise<ResultadoApagar> {
  await exigirUtilizador();
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return { ok: false, mensagem: "Pedido inválido." };
  const d = schema.despesas;
  const r = await db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(d).where(eq(d.divisaoId, id));
    const apagadas = await tx.delete(v).where(eq(v.id, id)).returning({ nome: v.nome });
    return { n, nome: apagadas[0]?.nome };
  });
  revalidatePath("/", "layout");
  if (!r.nome) return { ok: false, mensagem: "Esta divisão já tinha sido apagada." };
  const extra = r.n ? ` ${r.n} despesa${r.n === 1 ? " passou" : "s passaram"} a Não aplicável.` : "";
  return { ok: true, mensagem: `Divisão "${r.nome}" apagada.${extra}` };
}
