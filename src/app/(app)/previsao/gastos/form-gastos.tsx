"use client";

import { useActionState } from "react";
import { guardarGastos, type EstadoAcao } from "@/actions/contas";
import { BarraAcoes } from "@/components/barra-acoes";
import { MensagemAcao } from "@/components/mensagem-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { euros } from "@/lib/formato";

export interface MesGastos {
  /** AAAA-MM */
  mes: string;
  /** "Dezembro", ou "Novembro · resto do mês" no mês em curso. */
  titulo: string;
  /** O valor calculado pela app. */
  automatico: number;
  /** O valor escrito à mão, se houver. */
  editado: number | null;
  /** "No ano passado: Viagens 800 €" */
  dica?: string;
}

/** Os gastos mensais de cada mês da previsão: vazio usa o valor automático, ou escreve-se outro. */
export function FormGastos({ meses }: { meses: MesGastos[] }) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(guardarGastos, null);

  return (
    // A chave muda quando os valores guardados mudam, para os campos mostrarem o que ficou.
    <form key={meses.map((m) => m.editado ?? "").join("|")} action={acao} className="grid max-w-xl gap-4 max-md:pb-20">
      {meses.map((m) => {
        const ajuda = [m.editado != null && `Automático: ${euros(m.automatico, { inteiro: true })}`, m.dica].filter(Boolean).join(" · ");
        return (
          <div key={m.mes} className="grid gap-1.5">
            <Label htmlFor={`gasto-${m.mes}`}>{m.titulo}</Label>
            <div className="relative">
              <Input
                id={`gasto-${m.mes}`}
                name={`gasto:${m.mes}`}
                inputMode="decimal"
                autoComplete="off"
                defaultValue={m.editado != null ? String(m.editado).replace(".", ",") : ""}
                placeholder={String(Math.round(m.automatico))}
                aria-describedby={ajuda ? `ajuda-${m.mes}` : undefined}
                className="pr-8 tabular-nums"
              />
              <span className="text-texto-suave pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
            </div>
            {ajuda && (
              <p id={`ajuda-${m.mes}`} className="text-texto-suave text-sm">
                {ajuda}
              </p>
            )}
          </div>
        );
      })}

      <BarraAcoes>
        <MensagemAcao estado={estado} className="md:order-last" />
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : "Guardar"}
        </Button>
        <Button type="submit" variant="outline" name="repor" value="tudo" disabled={aGuardar || !meses.some((m) => m.editado != null)}>
          Repor automático
        </Button>
      </BarraAcoes>
    </form>
  );
}
