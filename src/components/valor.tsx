import { euros } from "@/lib/formato";
import { PRIVADO } from "@/lib/privacidade";
import { cn } from "@/lib/utils";

/**
 * Um valor em euros: algarismos alinhados, sem quebrar a meio. `privado` desfoca-o quando
 * os saldos estão escondidos (o botão do olho).
 */
export function Valor({
  v,
  inteiro = false,
  sinal = false,
  privado = false,
  className,
}: {
  v: number | null | undefined;
  /** Arredonda ao euro (totais, previsão, orçamento). */
  inteiro?: boolean;
  /** Mostra "+" nos positivos (parcelas da previsão). */
  sinal?: boolean;
  privado?: boolean;
  className?: string;
}) {
  return <span className={cn("tabular-nums whitespace-nowrap", privado && PRIVADO, className)}>{euros(v, { inteiro, sinal })}</span>;
}
