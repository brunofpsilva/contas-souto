"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirUtilizador } from "@/lib/auth";
import { MARCOS, mesDaData, validarDataEscritura, type Marco } from "@/lib/escritura";
import { plural } from "@/lib/formato";
import { mesPorExtenso } from "@/lib/meses";
import { sincronizar } from "@/lib/sync";
import { fraseErroSync } from "@/lib/sync-frases";
import { validarGastosEditados, validarReserva } from "@/lib/validacao";

export type EstadoAcao = { ok: boolean; mensagem: string; quando: number } | null;

const resposta = (ok: boolean, mensagem: string): EstadoAcao => ({ ok, mensagem, quando: Date.now() });

const TIPOS_MARCO: readonly Marco[] = ["escritura", "obra"];

/** Vai buscar saldos e movimentos ao Wallet. Em caso de erro, devolve uma frase simples. */
export async function sincronizarAgora(_anterior: EstadoAcao): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const r = await sincronizar({ origem: "manual", por: eu.email });
  revalidatePath("/", "layout");
  if (!r.ok) return resposta(false, fraseErroSync(r.codigo, r.tentarDaquiMin));
  const movimentos = r.avisoMovimentos != null ? " Movimentos por atualizar." : "";
  const aPreparar = r.walletASincronizar ? " O Wallet ainda está a preparar dados. Os saldos podem mudar." : "";
  return resposta(true, `Saldos atualizados.${movimentos}${aPreparar}`);
}

/**
 * Guarda as datas da escritura e do fim da obra e a reserva mínima (um só "Guardar").
 * As despesas pagas num marco passam para o mês da nova data. Se a data for apagada,
 * deixam de estar ligadas ao marco e ficam com o mês que tinham.
 */
export async function guardarDatasEReserva(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const datas: Record<Marco, string | null> = { escritura: null, obra: null };
  for (const tipo of TIPOS_MARCO) {
    const r = validarDataEscritura(form.get(tipo));
    if (!r.ok) return resposta(false, `A data ${MARCOS[tipo].de} não é válida.`);
    datas[tipo] = r.data;
  }
  const reserva = validarReserva(form.get("reserva"));
  if (!reserva.ok) return resposta(false, reserva.erro);

  const d = schema.despesas;
  const autor = () => ({ atualizadoPor: eu.email, atualizadoEm: new Date() });
  const definicao = { dataEscritura: datas.escritura, dataConclusaoObra: datas.obra, reserva: reserva.valor };

  const mudadas = await db.transaction(async (tx) => {
    await tx
      .insert(schema.definicoes)
      .values({ id: 1, ...definicao, atualizadoPor: eu.email })
      .onConflictDoUpdate({ target: schema.definicoes.id, set: { ...definicao, ...autor() } });
    const n: Record<Marco, number> = { escritura: 0, obra: 0 };
    for (const tipo of TIPOS_MARCO) {
      const data = datas[tipo];
      const marcada = tipo === "escritura" ? d.naEscritura : d.naConclusaoObra;
      const desligar = tipo === "escritura" ? { naEscritura: false } : { naConclusaoObra: false };
      const alteradas = await tx
        .update(d)
        .set(data ? { mes: mesDaData(data), ...autor() } : { ...desligar, ...autor() })
        .where(data ? and(eq(marcada, true), ne(d.mes, mesDaData(data))) : eq(marcada, true))
        .returning({ id: d.id });
      n[tipo] = alteradas.length;
    }
    return n;
  });

  revalidatePath("/", "layout");
  const extras = TIPOS_MARCO.flatMap((tipo) => {
    const n = mudadas[tipo];
    const data = datas[tipo];
    if (!n) return [];
    return data
      ? `${plural(n, "despesa")} ${n === 1 ? "passou" : "passaram"} para ${mesPorExtenso(mesDaData(data))}.`
      : `${plural(n, "despesa")} ${n === 1 ? "ficou com o mês que tinha" : "ficaram com o mês que tinham"}.`;
  });
  return resposta(true, ["Guardado.", ...extras].join(" "));
}

/**
 * Guarda as contas que contam para o saldo. `null` volta à seleção automática
 * (contam as contas com saldo positivo).
 */
export async function guardarContas(escolha: string[] | null): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const ids =
    escolha === null
      ? null
      : Array.isArray(escolha)
        ? escolha.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 200).slice(0, 500)
        : [];

  await db
    .insert(schema.definicoes)
    .values({ id: 1, contasEscolhidas: ids, atualizadoPor: eu.email })
    .onConflictDoUpdate({
      target: schema.definicoes.id,
      set: { contasEscolhidas: ids, atualizadoPor: eu.email, atualizadoEm: new Date() },
    });

  revalidatePath("/", "layout");
  return resposta(true, ids ? "Guardado." : "Seleção automática: contas com saldo positivo.");
}

/** Guarda os gastos mensais ajustados à mão; um campo vazio volta ao valor automático. */
export async function guardarGastos(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  // "Repor automático": todos os campos contam como vazios.
  const repor = form.get("repor") === "tudo";
  const entradas = [...form.entries()].map(([k, v]): [string, unknown] => [k, repor ? "" : v]);
  const r = validarGastosEditados(entradas);
  if (!r.ok) return resposta(false, r.erro);
  const g = schema.gastosEditados;

  await db.transaction(async (tx) => {
    if (r.apagar.length) await tx.delete(g).where(inArray(g.mes, r.apagar));
    for (const { mes, valor } of r.guardar) {
      await tx
        .insert(g)
        .values({ mes, valor, atualizadoPor: eu.email })
        .onConflictDoUpdate({ target: g.mes, set: { valor, atualizadoPor: eu.email, atualizadoEm: new Date() } });
    }
  });

  revalidatePath("/", "layout");
  const n = r.guardar.length;
  const mensagem = repor ? "Tudo em automático." : n ? `Guardado. ${n === 1 ? "1 mês ajustado" : `${n} meses ajustados`}.` : "Guardado. Tudo em automático.";
  return resposta(true, mensagem);
}
