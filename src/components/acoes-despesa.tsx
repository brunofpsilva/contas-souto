"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { apagarDespesa, definirEstado } from "@/actions/despesas";
import { Button } from "@/components/ui/button";

export function AcoesDespesa({ id, descricao, estado }: { id: number; descricao: string; estado: "previsto" | "pago" }) {
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
      <div role="group" aria-label={`Confirmar apagar ${descricao}`} className="flex flex-wrap items-center justify-end gap-1">
        <span className="text-sm">Apagar?</span>
        <Button size="sm" variant="destructive" disabled={aCorrer} onClick={() => correr(() => apagarDespesa(id))}>
          {aCorrer ? "A apagar…" : "Sim, apagar"}
        </Button>
        <Button size="sm" variant="ghost" disabled={aCorrer} onClick={() => setConfirmar(false)} autoFocus>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button
        size="sm"
        variant={estado === "pago" ? "ghost" : "outline"}
        disabled={aCorrer}
        onClick={() => correr(() => definirEstado(id, estado === "pago" ? "previsto" : "pago"))}
      >
        {estado === "pago" ? "Voltar a previsto" : "Marcar como pago"}
      </Button>
      <Button size="sm" variant="ghost" asChild>
        <Link href={`/despesas/${id}/editar`} aria-label={`Editar ${descricao}`}>
          Editar
        </Link>
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmar(true)} aria-label={`Apagar ${descricao}`}>
        Apagar
      </Button>
      {erro && (
        <p role="alert" className="text-destructive w-full text-right text-xs">
          {erro}
        </p>
      )}
    </div>
  );
}
