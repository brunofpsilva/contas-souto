"use client";

import { useActionState } from "react";
import { guardarConclusaoObra, guardarEscritura, type EstadoAcao } from "@/actions/contas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MARCOS, type Marco } from "@/lib/escritura";
import { euros } from "@/lib/formato";
import { cn } from "@/lib/utils";

const TEXTOS: Record<Marco, { explicacao: string; rotulo: string; botao: string }> = {
  escritura: {
    explicacao: "A previsão vai de hoje até esta data (ou até à conclusão da obra, se for depois).",
    rotulo: "Data da escritura",
    botao: "Guardar escritura",
  },
  obra: {
    explicacao: "Dia em que se paga o fim da obra ao empreiteiro. Se for depois da escritura, a previsão vai até aqui.",
    rotulo: "Data da conclusão da obra",
    botao: "Guardar conclusão da obra",
  },
};

/** Data de um marco (escritura ou conclusão da obra) e resumo das despesas pagas nele. */
export function FormMarco({
  tipo,
  data,
  nDespesas,
  totalDespesas,
}: {
  tipo: Marco;
  data: string | null;
  nDespesas: number;
  totalDespesas: number;
}) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(
    tipo === "escritura" ? guardarEscritura : guardarConclusaoObra,
    null,
  );
  const t = TEXTOS[tipo];
  const nome = MARCOS[tipo].nome;
  const s = nDespesas === 1 ? "" : "s";

  return (
    <form action={acao} className="grid content-start gap-4" aria-labelledby={`titulo-${tipo}`}>
      <div className="grid gap-1">
        <h2 id={`titulo-${tipo}`} className="font-heading text-lg font-bold">
          {MARCOS[tipo].titulo}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t.explicacao}{" "}
          {nDespesas
            ? `${nDespesas} despesa${s} paga${s} na ${nome} (${euros(totalDespesas)}); mudam de mês com a data.`
            : `Nenhuma despesa marcada como paga na ${nome}.`}
        </p>
      </div>

      <div className="grid gap-1.5 sm:max-w-xs">
        <Label htmlFor={`data-${tipo}`}>{t.rotulo}</Label>
        <Input id={`data-${tipo}`} name="data" type="date" defaultValue={data ?? ""} min="2020-01-01" max="2100-12-31" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="max-sm:h-11 max-sm:w-full" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : t.botao}
        </Button>
        <p aria-live="polite" className={cn("text-sm", estado?.ok ? "text-ok" : "text-destructive")}>
          {estado?.mensagem}
        </p>
      </div>
    </form>
  );
}
