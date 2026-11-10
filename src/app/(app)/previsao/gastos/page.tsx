import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { listarDespesas, obterContas, obterDatas, obterTendencia } from "@/lib/dados";
import { euros, maiuscula } from "@/lib/formato";
import { mesLongo } from "@/lib/meses";
import { calcularPrevisao } from "@/lib/previsao";
import { possiveisGastos } from "@/lib/vista-previsao";
import { FormGastos } from "./form-gastos";

export const metadata: Metadata = { title: "Gastos mensais" };

export default async function GastosMensaisPage() {
  const [despesas, contas, datas, tendencia] = await Promise.all([listarDespesas(), obterContas(), obterDatas(), obterTendencia()]);
  const p = calcularPrevisao({
    despesas,
    disponivel: contas.disponivel,
    reserva: contas.reserva,
    ...datas,
    fluxos: tendencia.fluxos,
  });
  // Só os meses que a previsão mostra.
  const gastos = tendencia.gastosPorCiclo.filter((g) => p.meses.some((m) => m.mes === g.mes));
  const possiveis = possiveisGastos(
    tendencia,
    gastos.map((g) => g.mes),
  );

  if (gastos.length === 0) {
    return (
      <Card className="max-w-xl p-4">
        <p>Sem movimentos do Wallet, não há gastos mensais para ajustar.</p>
      </Card>
    );
  }

  return (
    <FormGastos
      meses={gastos.map((g) => {
        const picos = possiveis.find((x) => x.mes === g.mes)?.picos;
        return {
          mes: g.mes,
          titulo: maiuscula(mesLongo(g.mes)) + (g.mes === p.mesAtual ? " · resto do mês" : ""),
          automatico: g.automatico,
          editado: g.editado,
          dica: picos ? `No ano passado: ${picos.map((x) => `${x.nome} ${euros(x.total, { inteiro: true })}`).join(", ")}` : undefined,
        };
      })}
    />
  );
}
