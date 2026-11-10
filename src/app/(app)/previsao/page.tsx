import type { Metadata } from "next";
import { ExtratoPrevisto } from "@/components/extrato-previsto";
import { GraficoSaldo } from "@/components/grafico-saldo";
import { TabelaTendencia } from "@/components/tabela-tendencia";
import { listarDespesas, obterContas, obterDatas, obterTendencia } from "@/lib/dados";
import { calcularPrevisao } from "@/lib/previsao";

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
  // Só os rendimentos anuais que caem dentro da previsão (o bónus e o IRS de maio/junho
  // ficam de fora quando a previsão acaba antes).
  const anuais = tendencia.anuais.filter((a) => p.meses.some((m) => m.mes.slice(5) === a.mesOrigem.slice(5)));

  return (
    <div className="grid gap-3">
      <ExtratoPrevisto
        p={p}
        anuais={anuais}
        ciclo={tendencia.cicloAtual}
        gastosPorCiclo={tendencia.gastosPorCiclo}
        grafico={
          !p.fim && p.resumo.disponivel != null ? (
            <GraficoSaldo
              pontos={p.meses.map((m) => ({
                mes: m.mes,
                saldo: m.saldo ?? 0,
                banda: null,
                saidas: m.saidas,
                atrasadas: m.atrasadas,
                entradasPrevistas: m.entradasPrevistas,
                saidasPrevistas: m.saidasPrevistas,
              }))}
              reserva={p.reserva}
            />
          ) : null
        }
      />
      <TabelaTendencia t={{ ...tendencia, anuais }} ciclos={tendencia.gastosPorCiclo.filter((g) => p.meses.some((m) => m.mes === g.mes))} />
    </div>
  );
}
