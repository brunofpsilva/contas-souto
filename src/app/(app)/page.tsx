import { ChevronRight, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { BotaoAtualizar } from "@/components/botao-atualizar";
import { EstadoPrevisao } from "@/components/estado-previsao";
import { LinhaDespesa } from "@/components/linha-despesa";
import { Seccao } from "@/components/seccao";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import { listarDespesas, obterContas, obterDatas, obterTendencia } from "@/lib/dados";
import { dataHora, euros } from "@/lib/formato";
import { proximosPagamentos, resumoInicio } from "@/lib/inicio";
import { calcularPrevisao } from "@/lib/previsao";
import { PRIVADO } from "@/lib/privacidade";
import { estadoSync } from "@/lib/sync";
import { cn } from "@/lib/utils";

const LIGACAO = "text-primaria focus-visible:ring-ring/50 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3";

/** O Início responde a uma pergunta: chega o dinheiro, e quanto sobra? O resto está nos outros separadores. */
export default async function InicioPage() {
  const [despesas, contas, sync, datas, tendencia] = await Promise.all([
    listarDespesas(),
    obterContas(),
    estadoSync(),
    obterDatas(),
    obterTendencia(),
  ]);
  const p = calcularPrevisao({
    despesas,
    disponivel: contas.disponivel,
    reserva: contas.reserva,
    ...datas,
    fluxos: tendencia.fluxos,
  });
  const r = p.resumo;
  const resumo = resumoInicio(p);
  const proximos = proximosPagamentos(despesas, p.mesAtual);
  const semDatas = !datas.dataEscritura && !datas.dataConclusaoObra;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-6">
      <div className="grid gap-3">
        <Card className="grid gap-1 p-4">
          <EstadoPrevisao tom={resumo.tom}>{resumo.titulo}</EstadoPrevisao>
          {resumo.valor != null ? (
            <>
              {/* O número grande. A cor fica no span de dentro: "text-numero" e "text-negativo" juntos anulavam-se. */}
              <p className="text-numero mt-2 font-semibold">
                <span className="sr-only">Saldo previsto: </span>
                <span className={cn(PRIVADO, resumo.valor < 0 && "text-negativo")}>{euros(resumo.valor, { inteiro: true })}</span>
              </p>
              <p className="text-texto-suave text-sm">{resumo.contexto}</p>
              {resumo.extra && (
                <p className="text-texto-suave text-sm">
                  {resumo.extra.texto}: <Valor v={resumo.extra.valor} inteiro privado className="text-texto font-medium" />
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-texto-suave mt-2 text-sm">A previsão precisa dos saldos do Wallet.</p>
              <BotaoAtualizar variante="default" className="mt-3" />
            </>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-2">
            <Link href="/definicoes#contas" className="focus-visible:ring-ring/50 grid min-h-11 content-center rounded-sm outline-none focus-visible:ring-3">
              <span className="text-texto-suave text-sm">Saldo hoje</span>
              <Valor v={r.disponivel} inteiro privado className="font-medium" />
            </Link>
            <Link
              href="/despesas?ver=por-pagar"
              className="focus-visible:ring-ring/50 grid min-h-11 content-center justify-items-end rounded-sm outline-none focus-visible:ring-3"
            >
              <span className="text-texto-suave text-sm">Por pagar</span>
              <Valor v={r.porPagar} inteiro className="font-medium" />
            </Link>
          </div>
        </Card>

        {sync.ultimoErro ? (
          <Alert variant="aviso">
            <TriangleAlert aria-hidden />
            <span>
              A última atualização falhou.{" "}
              <Link href="/definicoes#contas" className="font-medium underline underline-offset-4">
                Ver
              </Link>
            </span>
          </Alert>
        ) : (
          sync.ultimaOk && <p className="text-texto-suave px-1 text-xs">Atualizado {dataHora(sync.ultimaOk.terminadaEm ?? sync.ultimaOk.iniciadaEm)}</p>
        )}

        {semDatas && (
          <Card>
            <Link
              href="/definicoes#datas"
              className="focus-visible:ring-ring/50 flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 outline-none focus-visible:ring-3"
            >
              <span>Sem datas definidas.</span>
              <span className="text-primaria flex items-center gap-1 font-medium">
                Definir
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </Link>
          </Card>
        )}
      </div>

      <Seccao
        titulo="Próximos pagamentos"
        acao={
          proximos.length > 0 && (
            <Link href="/despesas?ver=por-pagar" className={cn(LIGACAO, "flex min-h-11 items-center text-sm")}>
              Ver todas
            </Link>
          )
        }
      >
        {proximos.length > 0 ? (
          <Card>
            <ul className="divide-y">
              {proximos.map((d) => (
                <LinhaDespesa key={d.id} d={d} datas={datas} resumida />
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="grid justify-items-start gap-3 p-4">
            <p>{despesas.length ? "Nada por pagar." : "Ainda não há despesas."}</p>
            <Button asChild variant="outline" className="max-sm:w-full">
              <Link href="/despesas/nova">
                <Plus aria-hidden />
                Adicionar despesa
              </Link>
            </Button>
          </Card>
        )}
      </Seccao>
    </div>
  );
}
