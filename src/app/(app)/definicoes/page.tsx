import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BotaoSair } from "@/components/botao-sair";
import { Seccao } from "@/components/seccao";
import { Card } from "@/components/ui/card";
import { exigirUtilizador } from "@/lib/auth";
import { listarDespesas, obterContas, obterDatas } from "@/lib/dados";
import type { Marco } from "@/lib/escritura";
import { dataHora } from "@/lib/formato";
import { marcoDe } from "@/lib/previsao";
import { estadoSync } from "@/lib/sync";
import { fraseErroSync } from "@/lib/sync-frases";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import { ContasWallet } from "./contas-wallet";
import { EscolhaTema } from "./escolha-tema";
import { FormDatas, type DadosMarco } from "./form-datas";

export const metadata: Metadata = { title: "Definições" };

export default async function DefinicoesPage() {
  const [eu, dados, sync, datas, despesas, biscoitos] = await Promise.all([
    exigirUtilizador(),
    obterContas(),
    estadoSync(),
    obterDatas(),
    listarDespesas(),
    cookies(),
  ]);

  const doMarco = (tipo: Marco, data: string | null): DadosMarco => {
    const lista = despesas.filter((d) => marcoDe(d) === tipo);
    return { data, nDespesas: lista.length, total: Math.round(lista.reduce((s, d) => s + d.valor, 0) * 100) / 100 };
  };

  const ultima = sync.ultimaOk;
  const erro = sync.ultimoErro;

  return (
    // No telemóvel, uma coluna pela ordem do código. A partir de md, as contas ficam à direita.
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <Seccao id="datas" titulo="Datas e reserva">
        <FormDatas
          marcos={{ escritura: doMarco("escritura", datas.dataEscritura), obra: doMarco("obra", datas.dataConclusaoObra) }}
          reserva={dados.reserva}
        />
      </Seccao>

      <Seccao id="contas" titulo="Contas do Wallet" className="md:row-span-3">
        <ContasWallet
          contas={dados.contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, saldo: c.saldo, moeda: c.moeda, incluida: c.incluida }))}
          escolhaManual={dados.escolhaManual}
          atualizado={ultima ? `Atualizado ${dataHora(ultima.terminadaEm ?? ultima.iniciadaEm)}` : null}
          falha={erro ? `A última atualização falhou (${dataHora(erro.iniciadaEm)}). ${fraseErroSync(erro.codigoErro)}` : null}
          aPreparar={Boolean(ultima?.walletASincronizar)}
        />
      </Seccao>

      <Seccao titulo="Tema">
        <EscolhaTema inicial={lerTema(biscoitos.get(COOKIE_TEMA)?.value)} />
      </Seccao>

      <Seccao titulo="Sessão">
        <Card className="flex min-h-14 items-center justify-between gap-3 py-1.5 pr-1.5 pl-4">
          <span className="min-w-0 truncate">{eu.nome}</span>
          <BotaoSair />
        </Card>
      </Seccao>
    </div>
  );
}
