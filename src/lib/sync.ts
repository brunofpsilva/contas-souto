// Sincronização dos saldos com o Wallet. Usada pelo botão (manual) e pelo cron.
import { and, desc, eq, gt, isNull, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { OrigemSync } from "./dominio";
import { lerContas, WalletError } from "./wallet";

const INTERVALO_MINIMO_MS = 30_000; // entre sincronizações manuais
const SYNC_PRESA_MS = 2 * 60_000; // uma sincronização "a decorrer" há mais do que isto é ignorada

export type ResultadoSync =
  | { ok: true; nContas: number; walletASincronizar: boolean }
  | { ok: false; mensagem: string; codigo: string };

export async function sincronizar({ origem, por }: { origem: OrigemSync; por?: string }): Promise<ResultadoSync> {
  const agora = Date.now();
  const s = schema.sincronizacoes;

  const [ultima] = await db.select().from(s).orderBy(desc(s.iniciadaEm)).limit(1);
  if (ultima && !ultima.terminadaEm && agora - ultima.iniciadaEm.getTime() < SYNC_PRESA_MS) {
    return { ok: false, mensagem: "Já está uma sincronização a decorrer. Espera uns segundos.", codigo: "a_decorrer" };
  }
  if (origem === "manual" && ultima && agora - ultima.iniciadaEm.getTime() < INTERVALO_MINIMO_MS) {
    return { ok: false, mensagem: "Os saldos foram atualizados há instantes. Tenta daqui a meio minuto.", codigo: "demasiado_cedo" };
  }

  const [registo] = await db.insert(s).values({ origem, iniciadaPor: por ?? null }).returning({ id: s.id });

  try {
    const r = await lerContas();
    const quando = new Date();

    // Se o Wallet ainda está a preparar os dados e não devolveu contas, mantemos as que temos.
    const manter = r.contas.length === 0 && r.sincronizacaoEmCurso;
    if (!manter) {
      await db.transaction(async (tx) => {
        const ids = r.contas.map((c) => c.id);
        if (ids.length) await tx.delete(schema.contas).where(notInArray(schema.contas.id, ids));
        else await tx.delete(schema.contas);
        if (ids.length) {
          await tx
            .insert(schema.contas)
            .values(r.contas.map((c) => ({ ...c, sincronizadoEm: quando })))
            .onConflictDoUpdate({
              target: schema.contas.id,
              set: {
                nome: sql`excluded.nome`,
                tipo: sql`excluded.tipo`,
                saldo: sql`excluded.saldo`,
                moeda: sql`excluded.moeda`,
                sincronizadoEm: sql`excluded.sincronizado_em`,
              },
            });
        }
      });
    }

    await db
      .update(s)
      .set({ terminadaEm: new Date(), ok: true, nContas: r.contas.length, walletASincronizar: r.sincronizacaoEmCurso })
      .where(eq(s.id, registo.id));
    return { ok: true, nContas: r.contas.length, walletASincronizar: r.sincronizacaoEmCurso };
  } catch (e) {
    const mensagem = e instanceof WalletError ? e.message : "Não foi possível ligar ao Wallet.";
    const codigo = e instanceof WalletError ? e.codigo : "desconhecido";
    if (!(e instanceof WalletError)) console.error("[sync]", e);
    await db.update(s).set({ terminadaEm: new Date(), ok: false, mensagem, codigoErro: codigo }).where(eq(s.id, registo.id));
    return { ok: false, mensagem, codigo };
  }
}

/** Última sincronização terminada com sucesso e último erro (se for mais recente). */
export async function estadoSync() {
  const s = schema.sincronizacoes;
  const [ultimaOk] = await db
    .select()
    .from(s)
    .where(eq(s.ok, true))
    .orderBy(desc(s.iniciadaEm))
    .limit(1);
  const [ultimoErro] = await db
    .select()
    .from(s)
    .where(and(eq(s.ok, false), ultimaOk ? gt(s.iniciadaEm, ultimaOk.iniciadaEm) : undefined))
    .orderBy(desc(s.iniciadaEm))
    .limit(1);
  const [aDecorrer] = await db
    .select({ id: s.id })
    .from(s)
    .where(and(isNull(s.terminadaEm), gt(s.iniciadaEm, new Date(Date.now() - SYNC_PRESA_MS))))
    .limit(1);
  return { ultimaOk: ultimaOk ?? null, ultimoErro: ultimoErro ?? null, aDecorrer: Boolean(aDecorrer) };
}
