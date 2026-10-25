"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirUtilizador } from "@/lib/auth";
import { MARCOS, mesDaData, validarDataEscritura, type Marco } from "@/lib/escritura";
import { mesPorExtenso } from "@/lib/meses";
import { sincronizar } from "@/lib/sync";
import { validarGastosEditados, validarReserva } from "@/lib/validacao";

export type EstadoAcao = { ok: boolean; mensagem: string; quando: number } | null;

export async function sincronizarAgora(_anterior: EstadoAcao): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const r = await sincronizar({ origem: "manual", por: eu.email });
  revalidatePath("/", "layout");
  if (!r.ok) return { ok: false, mensagem: r.mensagem, quando: Date.now() };
  const aviso = r.walletASincronizar ? " O Wallet ainda está a preparar dados; os saldos podem mudar em breve." : "";
  const movimentos =
    r.avisoMovimentos != null
      ? ` Movimentos não atualizados: ${r.avisoMovimentos}`
      : r.nMovimentos != null
        ? ` ${r.nMovimentos} movimentos lidos para a previsão.`
        : "";
  return {
    ok: true,
    mensagem: `Saldos atualizados (${r.nContas} conta${r.nContas === 1 ? "" : "s"}).${movimentos}${aviso}`,
    quando: Date.now(),
  };
}

/** Guarda a data da escritura (a previsão vai até ela, ou até à obra se for depois). */
export async function guardarEscritura(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  return guardarDataMarco("escritura", form);
}

/** Guarda a data da conclusão da obra (pagamento final ao empreiteiro). */
export async function guardarConclusaoObra(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  return guardarDataMarco("obra", form);
}

/**
 * As despesas pagas no marco passam para o mês da nova data. Se a data for apagada,
 * deixam de estar ligadas ao marco e ficam com o mês que tinham.
 */
async function guardarDataMarco(tipo: Marco, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const r = validarDataEscritura(form.get("data"));
  if (!r.ok) return { ok: false, mensagem: r.erro, quando: Date.now() };
  const { data } = r;
  const d = schema.despesas;
  const marcada = tipo === "escritura" ? d.naEscritura : d.naConclusaoObra;
  const definicao = tipo === "escritura" ? { dataEscritura: data } : { dataConclusaoObra: data };
  const desligar = tipo === "escritura" ? { naEscritura: false } : { naConclusaoObra: false };
  const autor = () => ({ atualizadoPor: eu.email, atualizadoEm: new Date() });

  const nDespesas = await db.transaction(async (tx) => {
    await tx
      .insert(schema.definicoes)
      .values({ id: 1, ...definicao, atualizadoPor: eu.email })
      .onConflictDoUpdate({ target: schema.definicoes.id, set: { ...definicao, ...autor() } });
    const alteradas = await tx
      .update(d)
      .set(data ? { mes: mesDaData(data), ...autor() } : { ...desligar, ...autor() })
      .where(data ? and(eq(marcada, true), ne(d.mes, mesDaData(data))) : eq(marcada, true))
      .returning({ id: d.id });
    return alteradas.length;
  });

  revalidatePath("/", "layout");
  const nome = MARCOS[tipo].nome;
  const plural = (n: number) => `${n} despesa${n === 1 ? "" : "s"}`;
  const extra = !nDespesas
    ? ""
    : data
      ? ` ${plural(nDespesas)} da ${nome} passaram para ${mesPorExtenso(mesDaData(data))}.`
      : ` ${plural(nDespesas)} deixaram de estar na ${nome} e ficaram com o mês que tinham.`;
  return { ok: true, mensagem: `Guardado.${extra}`, quando: Date.now() };
}

export async function guardarDefinicoes(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();

  const reserva = validarReserva(form.get("reserva"));
  if (!reserva.ok) return { ok: false, mensagem: reserva.erro, quando: Date.now() };

  // "defeito" volta à regra das contas com saldo positivo; "manter" não mexe na escolha.
  const porDefeito = form.get("modo") === "defeito";
  const manter = !porDefeito && form.get("selecao") === "manter";
  const ids = form.getAll("conta").filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 200);
  const escolha = porDefeito ? null : ids;

  await db
    .insert(schema.definicoes)
    .values({ id: 1, reserva: reserva.valor, contasEscolhidas: manter ? null : escolha, atualizadoPor: eu.email })
    .onConflictDoUpdate({
      target: schema.definicoes.id,
      set: {
        reserva: reserva.valor,
        ...(manter ? {} : { contasEscolhidas: escolha }),
        atualizadoPor: eu.email,
        atualizadoEm: new Date(),
      },
    });

  revalidatePath("/", "layout");
  return {
    ok: true,
    mensagem: porDefeito ? "Voltaste à regra por defeito: contam as contas com saldo positivo." : "Guardado.",
    quando: Date.now(),
  };
}

/** Guarda os gastos do dia a dia escritos à mão por ciclo; um campo vazio volta à previsão automática. */
export async function guardarGastos(_anterior: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  // "Voltar ao automático": todos os campos contam como vazios.
  const repor = form.get("repor") === "tudo";
  const entradas = [...form.entries()].map(([k, v]): [string, unknown] => [k, repor ? "" : v]);
  const r = validarGastosEditados(entradas);
  if (!r.ok) return { ok: false, mensagem: r.erro, quando: Date.now() };
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
  const mensagem = repor ? "Voltou tudo ao automático." : n ? `Guardado: ${n} ciclo${n === 1 ? "" : "s"} com valor teu.` : "Guardado: tudo automático.";
  return { ok: true, mensagem, quando: Date.now() };
}
