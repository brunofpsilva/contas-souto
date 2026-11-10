import type { EstadoAcao } from "@/actions/contas";
import { cn } from "@/lib/utils";

/** Resultado de uma ação ("Guardado." ou o erro), lido por leitores de ecrã sem interromper. */
export function MensagemAcao({ estado, className }: { estado: { ok: boolean; mensagem: string } | EstadoAcao; className?: string }) {
  return (
    <p aria-live="polite" className={cn("text-sm empty:hidden", estado?.ok ? "text-positivo" : "text-negativo", className)}>
      {estado?.mensagem}
    </p>
  );
}
