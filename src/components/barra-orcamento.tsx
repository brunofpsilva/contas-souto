import { euros } from "@/lib/formato";
import type { LinhaOrcamento } from "@/lib/orcamento";
import { cn } from "@/lib/utils";

/**
 * Pago + por pagar face ao orçamento. A barra inteira é o orçamento; se passar,
 * a escala passa a ser o total e um traço marca onde acaba o orçamento.
 */
export function BarraOrcamento({ l }: { l: Pick<LinhaOrcamento, "pago" | "porPagar" | "total" | "orcamento"> }) {
  if (l.orcamento == null) return null;
  const escala = Math.max(l.orcamento, l.total) || 1;
  const pct = (v: number) => `${(v / escala) * 100}%`;
  const passou = l.total > l.orcamento;
  return (
    <div className="bg-secondary relative flex h-2.5 gap-0.5 overflow-hidden rounded-[4px]" aria-hidden>
      {l.pago > 0 && <span className="bg-grafico-1" style={{ width: pct(l.pago) }} />}
      {l.porPagar > 0 && <span className="bg-grafico-2" style={{ width: pct(l.porPagar) }} />}
      {passou && <span className="bg-destructive absolute inset-y-0 w-0.5" style={{ left: pct(l.orcamento) }} />}
    </div>
  );
}

/** "faltam 1 200 €" ou "passou 300 €" (ou "sem orçamento"). */
export function TextoRestante({ l, className }: { l: Pick<LinhaOrcamento, "restante">; className?: string }) {
  if (l.restante == null) return <span className={cn("text-muted-foreground", className)}>sem orçamento</span>;
  if (l.restante < 0) return <span className={cn("text-destructive font-medium", className)}>passou {euros(-l.restante)}</span>;
  return <span className={cn("text-muted-foreground", className)}>faltam {euros(l.restante)}</span>;
}

export function LegendaOrcamento() {
  return (
    <p className="text-muted-foreground flex flex-wrap gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="bg-grafico-1 size-2.5 rounded-[3px]" aria-hidden />
        Pago
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-grafico-2 size-2.5 rounded-[3px]" aria-hidden />
        Por pagar
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-secondary size-2.5 rounded-[3px] border" aria-hidden />
        Por gastar
      </span>
    </p>
  );
}
