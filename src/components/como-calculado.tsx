import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import { MESES_CURTOS } from "@/lib/meses";
import { PRIVADO } from "@/lib/privacidade";
import type { Componente, RendimentoAnual } from "@/lib/tendencia";

/**
 * De onde vêm as entradas e os gastos mensais da previsão: cada parcela com o seu valor por
 * mês e a regra que o calcula. Fica fechado até alguém o querer ver.
 */
export function ComoCalculado({ componentes, anuais }: { componentes: Componente[]; anuais: RendimentoAnual[] }) {
  const entradas = componentes.filter((c) => c.sentido === "entrada");
  const saidas = componentes.filter((c) => c.sentido === "saida");

  return (
    <details className="group">
      <summary className="focus-visible:ring-ring/50 flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm font-semibold outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
        Como é calculado
      </summary>
      <Card className="mt-2 divide-y">
        {entradas.length > 0 && <Grupo titulo="Entradas por mês" linhas={entradas} privado />}
        {saidas.length > 0 && <Grupo titulo="Gastos mensais" linhas={saidas} />}
        {anuais.length > 0 && (
          <div className="grid gap-2 p-4">
            <h3 className="text-texto-suave text-sm font-medium">Uma vez por ano</h3>
            <dl className="grid gap-2">
              {anuais.map((a) => (
                <div key={`${a.tipo}-${a.mesOrigem}`} className="flex items-baseline justify-between gap-3">
                  <dt>
                    {a.nome} · {MESES_CURTOS[Number(a.mesOrigem.slice(5)) - 1]}
                  </dt>
                  <dd>
                    <Valor v={a.valor} inteiro privado />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Card>
    </details>
  );
}

function Grupo({ titulo, linhas, privado = false }: { titulo: string; linhas: Componente[]; privado?: boolean }) {
  return (
    <div className="grid gap-2 p-4">
      <h3 className="text-texto-suave text-sm font-medium">{titulo}</h3>
      <dl className="grid gap-2">
        {linhas.map((c) => (
          <div key={c.id} className="grid gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt>{c.nome}</dt>
              <dd>
                <Valor v={c.valor.base} inteiro privado={privado} />
              </dd>
            </div>
            {/* A regra dos salários tem valores: fica escondida com os saldos. */}
            <dd className={privado ? `text-texto-suave text-sm ${PRIVADO}` : "text-texto-suave text-sm"}>{c.regra}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
