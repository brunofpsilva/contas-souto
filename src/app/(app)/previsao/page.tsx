import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAtualizar } from "@/components/botao-atualizar";
import { ComoCalculado } from "@/components/como-calculado";
import { ContasFeitas } from "@/components/contas-feitas";
import { GraficoSaldo, type PontoSaldo } from "@/components/grafico-saldo";
import { MesAMes } from "@/components/mes-a-mes";
import { Seccao } from "@/components/seccao";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import { listarDespesas, obterContas, obterDatas, obterTendencia } from "@/lib/dados";
import { MARCOS } from "@/lib/escritura";
import { euros, maiuscula, plural } from "@/lib/formato";
import { mesLongo } from "@/lib/meses";
import { calcularPrevisao } from "@/lib/previsao";
import { contasFeitas, linhasPrevisao, possiveisGastos } from "@/lib/vista-previsao";

export const metadata: Metadata = { title: "Previsão" };

export default async function PrevisaoPage() {
  const [despesas, contas, datas, tendencia] = await Promise.all([listarDespesas(), obterContas(), obterDatas(), obterTendencia()]);
  const p = calcularPrevisao({
    despesas,
    disponivel: contas.disponivel,
    reserva: contas.reserva,
    ...datas,
    fluxos: tendencia.fluxos,
  });
  const contasAteAoFim = contasFeitas(p);

  if (!contasAteAoFim) {
    return (
      <Card className="grid max-w-xl gap-3 p-4">
        <p>A previsão precisa dos saldos do Wallet.</p>
        <BotaoAtualizar variante="default" />
      </Card>
    );
  }

  // Só o que cai dentro da previsão: os rendimentos anuais (o bónus e o IRS de maio/junho
  // ficam de fora quando a previsão acaba antes) e os gastos de cada mês.
  const anuais = tendencia.anuais.filter((a) => p.meses.some((m) => m.mes.slice(5) === a.mesOrigem.slice(5)));
  const gastos = tendencia.gastosPorCiclo.filter((g) => p.meses.some((m) => m.mes === g.mes));
  const linhas = linhasPrevisao(p, { anuais, ciclo: tendencia.cicloAtual, gastosPorCiclo: gastos });
  const possiveis = possiveisGastos(
    tendencia,
    gastos.map((g) => g.mes),
  );
  const pontos: PontoSaldo[] = [
    { chave: "hoje", saldo: contasAteAoFim.saldoHoje, entradas: 0, gastos: 0, despesas: 0 },
    ...p.meses.map((m) => ({ chave: m.mes, saldo: m.saldo ?? 0, entradas: m.entradasPrevistas, gastos: m.saidasPrevistas, despesas: m.saidas })),
  ];
  // O valor de um mês inteiro (o mês em curso só tem o que falta) e quantos foram ajustados à mão.
  const mesTipico = gastos.find((g) => g.mes !== p.mesAtual) ?? gastos[0];
  const nAjustados = gastos.filter((g) => g.editado != null).length;

  return (
    <div className="grid gap-6 md:grid-cols-12 md:items-start">
      {tendencia.avisos.length > 0 && (
        <div className="grid gap-2 md:col-span-12">
          {tendencia.avisos.map((a) => (
            <Alert key={a} variant="aviso">
              <TriangleAlert aria-hidden />
              <span>{a}</span>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:col-span-12 md:grid-cols-12 md:items-start md:gap-6">
        <Seccao titulo="Saldo previsto" className="md:col-span-7">
          <Card className="py-3 pr-2 pl-1">
            <GraficoSaldo pontos={pontos} reserva={p.reserva} marcos={p.marcos.map((x) => ({ chave: x.mes, titulo: MARCOS[x.tipo].titulo }))} />
          </Card>
        </Seccao>
        {/* O espaço em cima alinha o cartão com o do gráfico, que tem título. */}
        <section aria-label="As contas até ao saldo previsto" className="md:col-span-5 md:pt-13">
          <ContasFeitas c={contasAteAoFim} />
        </section>
      </div>

      <Seccao titulo="Mês a mês" className="md:col-span-12">
        <MesAMes saldoHoje={contasAteAoFim.saldoHoje} linhas={linhas} />
        {p.depoisDoFim.n > 0 && (
          <p className="text-texto-suave px-1 text-sm">
            {plural(p.depoisDoFim.n, "despesa")} ({euros(p.depoisDoFim.valor, { inteiro: true })}) {p.depoisDoFim.n === 1 ? "fica" : "ficam"} fora: a previsão vai
            até 36 meses.
          </p>
        )}
      </Seccao>

      {mesTipico && (
        <Seccao titulo="Gastos mensais" className="md:col-span-6">
          <Card className="grid gap-2 p-4">
            <p>
              <Valor v={mesTipico.automatico} inteiro className="font-medium" /> por mês ·{" "}
              {nAjustados ? (nAjustados === 1 ? "1 mês ajustado" : `${nAjustados} meses ajustados`) : "automático"}
            </p>
            {possiveis.map((x) => (
              <p key={x.mes} className="text-texto-suave text-sm">
                {maiuscula(mesLongo(x.mes))}: no ano passado, {x.picos.map((g) => `${g.nome} ${euros(g.total, { inteiro: true })}`).join(", ")}.
              </p>
            ))}
            <Button asChild variant="outline" className="justify-self-end">
              <Link href="/previsao/gastos">Ajustar</Link>
            </Button>
          </Card>
        </Seccao>
      )}

      {tendencia.componentes.length > 0 && (
        <div className="md:col-span-6">
          <ComoCalculado componentes={tendencia.componentes} anuais={anuais} />
        </div>
      )}
    </div>
  );
}
