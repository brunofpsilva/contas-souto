"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirUtilizador } from "@/lib/auth";
import { sincronizar } from "@/lib/sync";
import { validarReserva } from "@/lib/validacao";

export type EstadoAcao = { ok: boolean; mensagem: string; quando: number } | null;

export async function sincronizarAgora(_anterior: EstadoAcao): Promise<EstadoAcao> {
  const eu = await exigirUtilizador();
  const r = await sincronizar({ origem: "manual", por: eu.email });
  revalidatePath("/", "layout");
  if (!r.ok) return { ok: false, mensagem: r.mensagem, quando: Date.now() };
  const aviso = r.walletASincronizar ? " O Wallet ainda está a preparar dados; os saldos podem mudar em breve." : "";
  return { ok: true, mensagem: `Saldos atualizados (${r.nContas} conta${r.nContas === 1 ? "" : "s"}).${aviso}`, quando: Date.now() };
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
