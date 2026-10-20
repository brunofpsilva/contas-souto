"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { exigirUtilizador } from "@/lib/auth";
import { validarDespesa, type ErrosDespesa } from "@/lib/validacao";

export type EstadoFormDespesa = {
  erros: ErrosDespesa;
  mensagem?: string;
  /** O que foi submetido, para o formulário não perder o que se escreveu. */
  valores: Record<string, string>;
} | null;

const t = schema.despesas;

function lerForm(form: FormData): Record<string, string> {
  const campos = ["descricao", "valor", "mes", "categoria", "quem", "estado", "nota"] as const;
  return Object.fromEntries(campos.map((c) => [c, String(form.get(c) ?? "")]));
}

function idValido(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

export async function criarDespesa(_anterior: EstadoFormDespesa, form: FormData): Promise<EstadoFormDespesa> {
  const eu = await exigirUtilizador();
  const valores = lerForm(form);
  const r = validarDespesa(valores);
  if (!r.ok) return { erros: r.erros, valores };

  const pago = r.despesa.estado === "pago";
  await db.insert(t).values({
    ...r.despesa,
    criadoPor: eu.email,
    atualizadoPor: eu.email,
    pagoPor: pago ? eu.email : null,
    pagoEm: pago ? new Date() : null,
  });

  revalidatePath("/", "layout");
  redirect(form.get("seguinte") === "outra" ? "/despesas/nova?adicionada=1" : "/despesas");
}

export async function atualizarDespesa(id: number, _anterior: EstadoFormDespesa, form: FormData): Promise<EstadoFormDespesa> {
  const eu = await exigirUtilizador();
  const valores = lerForm(form);
  if (!idValido(id)) return { erros: {}, mensagem: "Despesa inválida.", valores };

  const [atual] = await db.select().from(t).where(eq(t.id, id)).limit(1);
  if (!atual) return { erros: {}, mensagem: "Esta despesa já não existe (pode ter sido apagada).", valores };

  const r = validarDespesa(valores);
  if (!r.ok) return { erros: r.erros, valores };

  const mudouParaPago = r.despesa.estado === "pago" && atual.estado !== "pago";
  const mudouParaPrevisto = r.despesa.estado !== "pago";
  await db
    .update(t)
    .set({
      ...r.despesa,
      atualizadoPor: eu.email,
      atualizadoEm: new Date(),
      ...(mudouParaPago ? { pagoPor: eu.email, pagoEm: new Date() } : {}),
      ...(mudouParaPrevisto ? { pagoPor: null, pagoEm: null } : {}),
    })
    .where(eq(t.id, id));

  revalidatePath("/", "layout");
  redirect("/despesas");
}

export type ResultadoAcao = { ok: true } | { ok: false; mensagem: string };

/** Marca como paga ou volta a prevista. Guarda quem marcou e quando. */
export async function definirEstado(id: number, estado: "pago" | "previsto"): Promise<ResultadoAcao> {
  const eu = await exigirUtilizador();
  if (!idValido(id) || (estado !== "pago" && estado !== "previsto")) return { ok: false, mensagem: "Pedido inválido." };

  const pago = estado === "pago";
  const linhas = await db
    .update(t)
    .set({
      estado,
      pagoPor: pago ? eu.email : null,
      pagoEm: pago ? new Date() : null,
      atualizadoPor: eu.email,
      atualizadoEm: new Date(),
    })
    .where(eq(t.id, id))
    .returning({ id: t.id });

  revalidatePath("/", "layout");
  return linhas.length ? { ok: true } : { ok: false, mensagem: "Esta despesa já não existe." };
}

export async function apagarDespesa(id: number): Promise<ResultadoAcao> {
  await exigirUtilizador();
  if (!idValido(id)) return { ok: false, mensagem: "Pedido inválido." };
  const linhas = await db.delete(t).where(eq(t.id, id)).returning({ id: t.id });
  revalidatePath("/", "layout");
  return linhas.length ? { ok: true } : { ok: false, mensagem: "Esta despesa já tinha sido apagada." };
}
