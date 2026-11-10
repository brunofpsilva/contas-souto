"use client";

import { Check } from "lucide-react";
import { startTransition, useOptimistic, useTransition } from "react";
import { definirEstado } from "@/actions/despesas";
import { useAviso } from "@/components/avisos";
import { cn } from "@/lib/utils";

/**
 * O círculo de cada despesa: um toque marca como paga (ou volta a por pagar). Muda logo no
 * ecrã e mostra um aviso com "Anular", porque a linha pode sair da lista que se está a ver.
 */
export function BotaoPago({ id, descricao, pago }: { id: number; descricao: string; pago: boolean }) {
  const [aCorrer, iniciar] = useTransition();
  const [marcado, setMarcado] = useOptimistic(pago);
  const aviso = useAviso();

  function alternar() {
    const novo = !marcado;
    iniciar(async () => {
      setMarcado(novo);
      const r = await definirEstado(id, novo ? "pago" : "previsto");
      if (!r.ok) return aviso({ texto: r.mensagem });
      aviso({
        texto: novo ? `«${descricao}» paga.` : `«${descricao}» por pagar.`,
        // Anular não depende desta linha, que entretanto pode já não estar no ecrã.
        acao: { texto: "Anular", aoClicar: () => startTransition(async () => void (await definirEstado(id, novo ? "previsto" : "pago"))) },
      });
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      aria-label={`${descricao}: ${marcado ? "marcar por pagar" : "marcar como paga"}`}
      disabled={aCorrer}
      onClick={alternar}
      className="group flex w-11 shrink-0 items-center justify-center self-stretch outline-none"
    >
      <span
        className={cn(
          "group-focus-visible:ring-ring/50 flex size-6 items-center justify-center rounded-full border-2 transition-colors group-focus-visible:ring-3",
          marcado ? "border-primaria bg-primaria text-sobre-primaria" : "border-borda-forte",
        )}
      >
        {marcado && <Check className="size-4" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}
