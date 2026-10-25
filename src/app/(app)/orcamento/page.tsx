import type { Metadata } from "next";
import { listarDespesas, listarDivisoes } from "@/lib/dados";
import { euros } from "@/lib/formato";
import { calcularOrcamento } from "@/lib/orcamento";
import { cn } from "@/lib/utils";
import { FormDivisoes, FormNovaDivisao } from "./form-divisoes";

export const metadata: Metadata = { title: "Orçamento" };

export default async function OrcamentoPage() {
  const [divisoes, despesas] = await Promise.all([listarDivisoes(), listarDespesas()]);
  const o = calcularOrcamento(divisoes, despesas);
  const g = o.geral;
  const passou = g.restante < 0;

  return (
    <>
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Orçamento</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Quanto podem gastar em cada divisão da casa. Conta o que já está pago e o que está por pagar. O orçamento geral é a
          soma das divisões; serve para comparar e não entra na previsão do saldo.
        </p>
      </div>

      {/* Telemóvel: orçamento geral em cima, gasto e o que falta lado a lado por baixo. */}
      <section aria-label="Orçamento geral" className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3">
        <Numero
          className="col-span-2 sm:col-span-1"
          rotulo="Orçamento geral" valor={euros(g.orcamento)} nota={`${divisoes.filter((d) => d.orcamento != null).length} de ${divisoes.length} divisões com orçamento`} />
        <Numero rotulo="Gasto" valor={euros(g.total)} nota={`pago ${euros(g.pago)} · por pagar ${euros(g.porPagar)}`} />
        <Numero
          rotulo={passou ? "Passou do orçamento" : "Falta gastar"}
          valor={euros(Math.abs(g.restante))}
          nota={g.nExcedidas ? `${g.nExcedidas} ${g.nExcedidas === 1 ? "divisão" : "divisões"} acima do orçamento` : "Nenhuma divisão acima do orçamento"}
          mau={passou}
        />
      </section>

      <FormDivisoes linhas={o.divisoes} naoAplicavel={o.naoAplicavel} />
      <FormNovaDivisao />
    </>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
  mau = false,
  className,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  mau?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-card grid min-w-0 content-start gap-1 px-3 py-3 sm:px-4", className)}>
      <p className="text-muted-foreground text-[0.6875rem] leading-tight font-semibold tracking-wider uppercase sm:text-xs">{rotulo}</p>
      <p className={cn("truncate text-lg font-semibold tabular-nums min-[400px]:text-xl sm:text-2xl", mau && "text-destructive")}>{valor}</p>
      {nota && <p className="text-muted-foreground text-xs first-letter:uppercase sm:truncate">{nota}</p>}
    </div>
  );
}
