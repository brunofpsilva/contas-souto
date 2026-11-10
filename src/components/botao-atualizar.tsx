"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { sincronizarAgora, type EstadoAcao } from "@/actions/contas";
import { MensagemAcao } from "@/components/mensagem-acao";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Atualizar saldos": vai buscar saldos e movimentos ao Wallet e diz como correu. */
export function BotaoAtualizar({
  variante = "outline",
  className,
  classeMensagem,
}: {
  variante?: "default" | "outline";
  className?: string;
  classeMensagem?: string;
}) {
  const [estado, acao, aAtualizar] = useActionState<EstadoAcao>(sincronizarAgora, null);
  return (
    <>
      <form action={acao} className={className}>
        <Button type="submit" variant={variante} className="w-full" disabled={aAtualizar}>
          <RefreshCw className={cn(aAtualizar && "animate-spin")} aria-hidden />
          {aAtualizar ? "A atualizar…" : "Atualizar saldos"}
        </Button>
      </form>
      <MensagemAcao estado={estado} className={classeMensagem} />
    </>
  );
}
