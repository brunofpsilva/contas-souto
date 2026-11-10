"use client";

import { useActionState } from "react";
import { guardarDatasEReserva, type EstadoAcao } from "@/actions/contas";
import { Ajuda } from "@/components/ajuda";
import { MensagemAcao } from "@/components/mensagem-acao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Valor } from "@/components/valor";
import { MARCOS, type Marco } from "@/lib/escritura";
import { plural } from "@/lib/formato";
import { PRIVADO } from "@/lib/privacidade";
import { cn } from "@/lib/utils";

export interface DadosMarco {
  /** AAAA-MM-DD, ou null sem data. */
  data: string | null;
  /** Despesas pagas neste marco. */
  nDespesas: number;
  total: number;
}

/** As duas datas e a reserva mínima, gravadas com um só botão. */
export function FormDatas({ marcos, reserva }: { marcos: Record<Marco, DadosMarco>; reserva: number }) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(guardarDatasEReserva, null);

  return (
    <Card className="p-4">
      <form action={acao} className="grid gap-4">
        {(["escritura", "obra"] as const).map((tipo) => {
          const m = marcos[tipo];
          return (
            <div key={tipo} className="grid gap-1.5">
              <Label htmlFor={`data-${tipo}`}>{MARCOS[tipo].titulo}</Label>
              <Input id={`data-${tipo}`} name={tipo} type="date" defaultValue={m.data ?? ""} min="2020-01-01" max="2100-12-31" />
              {m.nDespesas > 0 && (
                <p className="text-texto-suave text-sm">
                  {plural(m.nDespesas, "despesa")} · <Valor v={m.total} inteiro />
                </p>
              )}
            </div>
          );
        })}

        <div className="grid gap-1.5">
          <div className="-my-2 flex items-center justify-between">
            <Label htmlFor="reserva">Reserva mínima</Label>
            <Ajuda rotulo="O que é a reserva mínima" className="-mr-3">
              Avisa quando o saldo previsto fica abaixo deste valor.
            </Ajuda>
          </div>
          <div className="relative">
            <Input
              id="reserva"
              name="reserva"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={reserva ? String(reserva).replace(".", ",") : ""}
              placeholder="0"
              className={cn("pr-8 tabular-nums", PRIVADO)}
            />
            <span className="text-texto-suave pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit" className="max-sm:w-full" disabled={aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar"}
          </Button>
          <MensagemAcao estado={estado} />
        </div>
      </form>
    </Card>
  );
}
