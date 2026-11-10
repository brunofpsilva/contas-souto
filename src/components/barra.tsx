import { Valor } from "@/components/valor";
import { cn } from "@/lib/utils";

/**
 * Barra fina com o que está pago e o que está por pagar: dois tons da mesma cor, para se
 * distinguirem pela luminosidade. Com `limite`, o fundo da barra é o que ainda está
 * disponível; se o total passar o limite, um traço marca onde ele fica.
 */
export function Barra({
  pago,
  porPagar,
  limite = null,
  escala,
  className,
}: {
  pago: number;
  porPagar: number;
  limite?: number | null;
  /** Valor que enche a barra, para comparar várias entre si. Por defeito, o limite ou o total. */
  escala?: number;
  className?: string;
}) {
  const total = pago + porPagar;
  const cheio = Math.max(escala ?? 0, limite ?? 0, total) || 1;
  const pct = (v: number) => `${(v / cheio) * 100}%`;
  const passou = limite != null && total > limite;
  return (
    <div className={cn("relative flex h-2 gap-0.5 overflow-hidden rounded-full", limite != null && "bg-superficie-suave", className)} aria-hidden>
      {passou && <span className="bg-texto absolute inset-y-0 z-10 w-0.5" style={{ left: pct(limite) }} />}
      {pago > 0 && <span className="bg-grafico-pago last:rounded-r-full" style={{ width: pct(pago) }} />}
      {porPagar > 0 && <span className="bg-grafico-por-pagar last:rounded-r-full" style={{ width: pct(porPagar) }} />}
    </div>
  );
}

/** Legenda da barra. Com valores, mostra-os ao lado de cada nome. */
export function Legenda({
  pago,
  porPagar,
  disponivel = false,
  className,
}: {
  pago?: number;
  porPagar?: number;
  /** Mostra também "Disponível" (o fundo da barra, quando há limite). */
  disponivel?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("text-texto-suave flex flex-wrap gap-x-4 gap-y-1 text-xs", className)}>
      <Item cor="bg-grafico-pago">
        Pago{pago != null && <Valor v={pago} inteiro className="text-texto" />}
      </Item>
      <Item cor="bg-grafico-por-pagar">
        Por pagar{porPagar != null && <Valor v={porPagar} inteiro className="text-texto" />}
      </Item>
      {disponivel && <Item cor="bg-superficie-suave border">Disponível</Item>}
    </p>
  );
}

function Item({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 shrink-0 rounded-sm", cor)} aria-hidden />
      {children}
    </span>
  );
}
