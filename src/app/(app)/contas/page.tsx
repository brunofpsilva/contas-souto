import type { Metadata } from "next";
import { listarDespesas, nomesUtilizadores, obterContas, obterDatas } from "@/lib/dados";
import { dataHora } from "@/lib/formato";
import { estadoSync } from "@/lib/sync";
import { FormContas } from "./form-contas";
import { FormMarco } from "./form-escritura";
import { PainelSync } from "./painel-sync";

export const metadata: Metadata = { title: "Contas" };

export default async function ContasPage() {
  const [dados, sync, nomes, datas, despesas] = await Promise.all([
    obterContas(),
    estadoSync(),
    nomesUtilizadores(),
    obterDatas(),
    listarDespesas(),
  ]);
  const daEscritura = despesas.filter((d) => d.naEscritura);
  const daObra = despesas.filter((d) => d.naConclusaoObra);
  const total = (l: typeof despesas) => Math.round(l.reduce((s, d) => s + d.valor, 0) * 100) / 100;

  const ultima = sync.ultimaOk;
  const textoUltima = ultima
    ? `Última sincronização: ${dataHora(ultima.terminadaEm ?? ultima.iniciadaEm)} · ${
        ultima.origem === "cron" ? "automática" : `por ${nomes.get(ultima.iniciadaPor ?? "") ?? "alguém"}`
      }`
    : "Ainda não sincronizado com o Wallet.";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">
            Saldos do Wallet. As contas de investimento e as arquivadas não aparecem.
          </p>
        </div>
        <PainelSync
          textoUltima={textoUltima}
          erro={sync.ultimoErro ? { mensagem: sync.ultimoErro.mensagem ?? "Erro desconhecido.", quando: dataHora(sync.ultimoErro.iniciadaEm) } : null}
          walletASincronizar={Boolean(ultima?.walletASincronizar)}
        />
      </div>

      <FormContas
        contas={dados.contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, saldo: c.saldo, moeda: c.moeda, incluida: c.incluida }))}
        escolhaManual={dados.escolhaManual}
        reserva={dados.reserva}
      />

      <section aria-label="Datas" className="bg-card grid gap-6 rounded-xl border p-4 md:grid-cols-2">
        <FormMarco tipo="escritura" data={datas.dataEscritura} nDespesas={daEscritura.length} totalDespesas={total(daEscritura)} />
        <FormMarco tipo="obra" data={datas.dataConclusaoObra} nDespesas={daObra.length} totalDespesas={total(daObra)} />
      </section>
    </>
  );
}
