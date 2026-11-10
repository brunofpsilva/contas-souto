"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { apagarDespesa } from "@/actions/despesas";
import { Confirmar } from "@/components/confirmar";
import { Button } from "@/components/ui/button";

/** "Apagar despesa", com confirmação. Se correr bem, a ação volta à lista. */
export function ApagarDespesa({ id, descricao }: { id: number; descricao: string }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-1">
      <Confirmar
        titulo={`Apagar «${descricao}»?`}
        textoConfirmar="Apagar despesa"
        aoConfirmar={async () => {
          const r = await apagarDespesa(id);
          if (r && !r.ok) setErro(r.mensagem);
        }}
      >
        <Button type="button" variant="ghost" className="text-negativo -ml-4">
          <Trash2 aria-hidden />
          Apagar despesa
        </Button>
      </Confirmar>
      {erro && (
        <p role="alert" className="text-negativo text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}
