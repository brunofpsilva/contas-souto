import type { Metadata } from "next";
import { obterContas, nomesUtilizadores } from "@/lib/dados";
import { dataHora } from "@/lib/formato";
import { estadoSync } from "@/lib/sync";
import { FormContas } from "./form-contas";
import { PainelSync } from "./painel-sync";

export const metadata: Metadata = { title: "Contas" };

export default async function ContasPage() {
  const [dados, sync, nomes] = await Promise.all([obterContas(), estadoSync(), nomesUtilizadores()]);

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
    </>
  );
}
