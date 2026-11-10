import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import type { ContasFeitas as Contas } from "@/lib/vista-previsao";
import { cn } from "@/lib/utils";

/**
 * As contas de hoje até ao último marco: saldo hoje, mais entradas, menos gastos mensais,
 * menos despesas, igual ao saldo previsto. Mostra de onde vem o número do Início.
 */
export function ContasFeitas({ c, className }: { c: Contas; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <dl className="grid gap-2">
        <Linha rotulo="Saldo hoje">
          <Valor v={c.saldoHoje} inteiro privado />
        </Linha>
        <Linha rotulo="Entradas">
          <Valor v={c.entradas} inteiro sinal privado />
        </Linha>
        <Linha rotulo="Gastos mensais">
          <Valor v={-c.gastos} inteiro />
        </Linha>
        <Linha rotulo="Despesas">
          <Valor v={-c.despesas} inteiro />
        </Linha>
        <div className="flex items-baseline justify-between gap-3 border-t pt-3 font-semibold">
          <dt>{c.rotulo}</dt>
          <dd>
            <Valor v={c.saldo} inteiro privado className={cn(c.saldo < 0 && "text-negativo")} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-texto-suave">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
