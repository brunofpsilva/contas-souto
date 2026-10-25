"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { sincronizarAgora, type EstadoAcao } from "@/actions/contas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PainelSync({
  textoUltima,
  erro,
  walletASincronizar,
}: {
  textoUltima: string;
  erro: { mensagem: string; quando: string } | null;
  walletASincronizar: boolean;
}) {
  const [estado, acao, aCorrer] = useActionState<EstadoAcao>(sincronizarAgora, null);

  return (
    <div className="grid w-full gap-2 sm:w-auto sm:justify-items-end">
      <form action={acao}>
        <Button type="submit" variant="outline" className="w-full sm:w-auto" disabled={aCorrer}>
          <RefreshCw className={cn(aCorrer && "animate-spin")} aria-hidden />
          {aCorrer ? "A sincronizar…" : "Sincronizar com Wallet"}
        </Button>
      </form>
      <p className="text-muted-foreground text-xs sm:text-right">{textoUltima}</p>
      <div aria-live="polite" className="contents">
        {estado && (
          <p className={cn("max-w-sm text-sm sm:text-right", estado.ok ? "text-ok" : "text-destructive")}>{estado.mensagem}</p>
        )}
        {!estado && erro && (
          <p className="text-destructive max-w-sm text-sm sm:text-right">
            A última tentativa falhou ({erro.quando}): {erro.mensagem}
          </p>
        )}
        {!estado && !erro && walletASincronizar && (
          <p className="text-aviso max-w-sm text-sm sm:text-right">
            O Wallet ainda estava a preparar dados na última sincronização; os saldos podem mudar.
          </p>
        )}
      </div>
    </div>
  );
}
