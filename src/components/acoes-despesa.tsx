"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { apagarDespesa, definirEstado } from "@/actions/despesas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// No telemóvel os botões ocupam a largura toda e ficam mais altos, para o dedo.
const BOTAO = "max-sm:h-10";

export function AcoesDespesa({
  id,
  descricao,
  estado,
  className,
}: {
  id: number;
  descricao: string;
  estado: "previsto" | "pago";
  className?: string;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aCorrer, iniciar] = useTransition();

  function correr(acao: () => Promise<{ ok: true } | { ok: false; mensagem: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.mensagem);
      setConfirmar(false);
    });
  }

  if (confirmar) {
    return (
      <div
        role="group"
        aria-label={`Confirmar apagar ${descricao}`}
        className={cn("flex flex-wrap items-center gap-2 sm:justify-end sm:gap-1", className)}
      >
        <span className="text-sm">Apagar?</span>
        <Button
          size="sm"
          variant="destructive"
          className={cn(BOTAO, "max-sm:flex-1")}
          disabled={aCorrer}
          onClick={() => correr(() => apagarDespesa(id))}
        >
          {aCorrer ? "A apagar…" : "Sim, apagar"}
        </Button>
        <Button size="sm" variant="ghost" className={BOTAO} disabled={aCorrer} onClick={() => setConfirmar(false)} autoFocus>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:justify-end sm:gap-1", className)}>
      <Button
        size="sm"
        variant={estado === "pago" ? "ghost" : "outline"}
        className={cn(BOTAO, "max-sm:flex-1")}
        disabled={aCorrer}
        onClick={() => correr(() => definirEstado(id, estado === "pago" ? "previsto" : "pago"))}
      >
        {estado === "pago" ? "Voltar a previsto" : "Marcar como pago"}
      </Button>
      <Button size="sm" variant="ghost" className={BOTAO} asChild>
        <Link href={`/despesas/${id}/editar`} aria-label={`Editar ${descricao}`}>
          Editar
        </Link>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={cn(BOTAO, "text-destructive")}
        onClick={() => setConfirmar(true)}
        aria-label={`Apagar ${descricao}`}
      >
        Apagar
      </Button>
      {erro && (
        <p role="alert" className="text-destructive w-full text-xs sm:text-right">
          {erro}
        </p>
      )}
    </div>
  );
}
