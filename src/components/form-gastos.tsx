"use client";

import { useActionState } from "react";
import { guardarGastos, type EstadoAcao } from "@/actions/contas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { euros } from "@/lib/formato";
import { mesCurto } from "@/lib/meses";
import type { GastoCiclo } from "@/lib/tendencia";
import { cn } from "@/lib/utils";

/** Gastos do dia a dia e renda de cada ciclo da previsão: vazio = automático, ou um valor teu. */
export function FormGastos({ ciclos }: { ciclos: GastoCiclo[] }) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(guardarGastos, null);
  const inteiro = (v: number) => euros(v, { inteiro: true });

  return (
    // A chave muda quando os valores guardados mudam, para os campos mostrarem o que ficou.
    <form key={ciclos.map((c) => c.editado ?? "").join("|")} action={acao} className="bg-card grid gap-3 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Gastos e renda por ciclo</h3>
      <ul className="grid gap-2">
        {ciclos.map((c, i) => (
          <li key={c.mes} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 sm:grid-cols-[4.5rem_10rem_1fr]">
            <label htmlFor={`gasto-${c.mes}`} className="text-sm">
              {mesCurto(c.mes)}
              {i === 0 && <span className="text-muted-foreground block text-xs">o que falta</span>}
            </label>
            <Input
              id={`gasto-${c.mes}`}
              name={`gasto:${c.mes}`}
              inputMode="decimal"
              autoComplete="off"
              defaultValue={c.editado != null ? String(c.editado).replace(".", ",") : ""}
              placeholder={String(Math.round(c.automatico))}
              className="font-mono tabular-nums"
            />
            <span className="text-muted-foreground col-span-2 text-xs sm:col-span-1">
              automático {inteiro(c.automatico)}
              {c.editado != null && <span className="text-foreground font-medium"> · a usar o teu</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button type="submit" size="sm" className="max-sm:h-10 max-sm:flex-1" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : "Guardar gastos"}
        </Button>
        <Button type="submit" size="sm" variant="outline" className="max-sm:h-10 max-sm:flex-1" name="repor" value="tudo" disabled={aGuardar || !ciclos.some((c) => c.editado != null)}>
          Voltar ao automático
        </Button>
        <p aria-live="polite" className={cn("text-sm", estado?.ok ? "text-ok" : "text-destructive")}>
          {estado?.mensagem}
        </p>
      </div>
    </form>
  );
}
