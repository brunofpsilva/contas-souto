// Sincronização dos saldos com o Wallet. Usada pelo botão (manual) e pelo cron.
import { and, desc, eq, gt, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { OrigemSync } from "./dominio";
import { mesDe, somarMeses } from "./meses";
import { lerContas, lerMovimentos, WalletError, type ContaWallet } from "./wallet";

const INTERVALO_MINIMO_MS = 30_000; // entre sincronizações manuais
const SYNC_PRESA_MS = 2 * 60_000; // uma sincronização "a decorrer" há mais do que isto é ignorada
// Os movimentos custam uns 10 pedidos (o limite é 500 por hora): no máximo uma vez por hora.
const INTERVALO_MOVIMENTOS_MS = 55 * 60_000;
/** Meses completos de histórico (o subsídio de Natal só se repete ao fim de 12). */
export const MESES_HISTORICO = 12;

export type ResultadoSync =
  | { ok: true; nContas: number; nMovimentos: number | null; walletASincronizar: boolean; avisoMovimentos?: string }
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

    // Os movimentos não impedem a atualização dos saldos: se falharem, fica o aviso.
    let nMovimentos: number | null = null;
    let avisoMovimentos: string | undefined;
    if (!manter && (await movimentosDesatualizados(agora))) {
      try {
        nMovimentos = await atualizarMovimentos(r.contas, new Date());
      } catch (e) {
        avisoMovimentos = e instanceof WalletError ? e.message : "Não foi possível ler os movimentos do Wallet.";
        if (!(e instanceof WalletError)) console.error("[sync movimentos]", e);
      }
    }

    await db
      .update(s)
      .set({
        terminadaEm: new Date(),
        ok: true,
        nContas: r.contas.length,
        nMovimentos,
        mensagem: avisoMovimentos ?? null,
        walletASincronizar: r.sincronizacaoEmCurso,
      })
      .where(eq(s.id, registo.id));
    return { ok: true, nContas: r.contas.length, nMovimentos, walletASincronizar: r.sincronizacaoEmCurso, avisoMovimentos };
  } catch (e) {
    const mensagem = e instanceof WalletError ? e.message : "Não foi possível ligar ao Wallet.";
    const codigo = e instanceof WalletError ? e.codigo : "desconhecido";
    if (!(e instanceof WalletError)) console.error("[sync]", e);
    await db.update(s).set({ terminadaEm: new Date(), ok: false, mensagem, codigoErro: codigo }).where(eq(s.id, registo.id));
    return { ok: false, mensagem, codigo };
  }
}

async function movimentosDesatualizados(agora: number): Promise<boolean> {
  const s = schema.sincronizacoes;
  const [ultima] = await db
    .select({ quando: s.terminadaEm })
    .from(s)
    .where(and(eq(s.ok, true), isNotNull(s.nMovimentos)))
    .orderBy(desc(s.iniciadaEm))
    .limit(1);
  return !ultima?.quando || agora - ultima.quando.getTime() >= INTERVALO_MOVIMENTOS_MS;
}

/**
 * Substitui os movimentos guardados pelos dos últimos 12 meses completos e do mês atual,
 * só das contas sincronizadas (sem arquivadas nem investimentos).
 */
async function atualizarMovimentos(contas: readonly ContaWallet[], quando: Date): Promise<number> {
  const primeiroMes = somarMeses(mesDe(quando), -MESES_HISTORICO);
  // Um dia antes do início do mês em UTC, para não perder movimentos da meia-noite de Lisboa.
  const desde = new Date(Date.parse(`${primeiroMes}-01T00:00:00Z`) - 86_400_000);
  const ids = new Set(contas.map((c) => c.id));
  const lista = (await lerMovimentos(desde))
    .filter((m) => ids.has(m.contaId))
    .map((m) => ({ ...m, mes: mesDe(m.data), sincronizadoEm: quando }))
    .filter((m) => m.mes >= primeiroMes);

  await db.transaction(async (tx) => {
    await tx.delete(schema.movimentos);
    for (let i = 0; i < lista.length; i += 500) {
      await tx.insert(schema.movimentos).values(lista.slice(i, i + 500));
    }
  });
  return lista.length;
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
