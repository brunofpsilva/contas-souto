"use client";

import { ChevronDown, CircleX, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import type { LinhaPrevisao } from "@/lib/vista-previsao";
import { cn } from "@/lib/utils";

// Um só componente para os dois tamanhos. No telemóvel é uma lista: cada linha mostra o mês e
// o saldo, e abre as parcelas com um toque. A partir de md as mesmas parcelas ficam sempre à
// vista, em colunas, como numa tabela.
const GRELHA = "md:grid md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] md:items-baseline md:gap-x-4 md:px-4";

export function MesAMes({ saldoHoje, linhas }: { saldoHoje: number; linhas: LinhaPrevisao[] }) {
  return (
    <Card className="overflow-hidden">
      <div className={cn(GRELHA, "text-texto-suave border-b py-2.5 text-xs font-medium max-md:hidden")} aria-hidden>
        <span>Mês</span>
        <span className="text-right">Entradas</span>
        <span className="text-right">Gastos mensais</span>
        <span className="text-right">Despesas</span>
        <span className="text-right">Saldo previsto</span>
      </div>
      <ol className="divide-y">
        <li className="flex min-h-12 items-center justify-between gap-3 px-4 md:py-2.5">
          <span className="text-texto-suave">Saldo hoje</span>
          {/* O espaço à direita alinha com o saldo das linhas que têm seta. */}
          <Valor v={saldoHoje} inteiro privado className="font-medium max-md:mr-7" />
        </li>
        {linhas.map((l) => (
          <Linha key={l.chave} l={l} />
        ))}
      </ol>
    </Card>
  );
}

function Linha({ l }: { l: LinhaPrevisao }) {
  const [aberta, setAberta] = useState(false);
  const temParcelas = l.entradas > 0 || l.gastos > 0 || l.despesas > 0 || l.notas.length > 0;
  const idParcelas = `parcelas-${l.chave}`;

  const titulo = (
    <span className="grid min-w-0 justify-items-start gap-1">
      <span className={cn(l.marco && "font-medium")}>
        {l.titulo}
        {l.ate && <span className="text-texto-suave"> · {l.ate}</span>}
      </span>
      {l.alerta === "falta" && (
        <Badge variant="negativo">
          <CircleX aria-hidden />
          Falta dinheiro
        </Badge>
      )}
      {l.alerta === "reserva" && (
        <Badge variant="aviso">
          <TriangleAlert aria-hidden />
          Abaixo da reserva
        </Badge>
      )}
    </span>
  );
  const saldo = <Valor v={l.saldo} inteiro privado className={cn("font-medium", l.alerta === "falta" && "text-negativo")} />;

  return (
    <li className={cn(GRELHA, "md:py-2.5", l.marco && "bg-superficie-suave/60")}>
      {/* Telemóvel: a linha é um botão que abre e fecha as parcelas. */}
      <button
        type="button"
        aria-expanded={temParcelas ? aberta : undefined}
        aria-controls={temParcelas ? idParcelas : undefined}
        disabled={!temParcelas}
        onClick={() => setAberta(!aberta)}
        className="focus-visible:ring-ring/50 flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset md:hidden"
      >
        <span className="min-w-0 flex-1">{titulo}</span>
        {saldo}
        <ChevronDown
          className={cn("text-texto-suave size-4 shrink-0 transition-transform", aberta && "rotate-180", !temParcelas && "invisible")}
          aria-hidden
        />
      </button>

      <div className="max-md:hidden">{titulo}</div>
      <dl id={idParcelas} className={cn("grid gap-1.5 px-4 pb-3 text-sm md:contents md:text-base", !aberta && "max-md:hidden")}>
        <Parcela rotulo="Entradas" v={l.entradas} privado />
        <Parcela rotulo="Gastos mensais" v={-l.gastos} />
        <Parcela rotulo="Despesas" v={-l.despesas} />
      </dl>
      <div className="text-right max-md:hidden">{saldo}</div>

      {l.notas.length > 0 && (
        <ul className={cn("text-texto-suave grid gap-0.5 px-4 pb-3 text-sm md:col-span-5 md:px-0 md:pt-1 md:pb-0", !aberta && "max-md:hidden")}>
          {l.notas.map((n) => (
            <li key={n.texto}>
              {n.texto}
              {n.valor != null && (
                <>
                  {" "}
                  <Valor v={n.valor} inteiro privado={n.privado} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Uma parcela do mês. No telemóvel só aparece se não for zero; em colunas, um zero é um travessão. */
function Parcela({ rotulo, v, privado = false }: { rotulo: string; v: number; privado?: boolean }) {
  if (!v) return <div className="text-texto-suave text-right max-md:hidden">—</div>;
  return (
    <div className="flex items-baseline justify-between gap-3 md:block md:text-right">
      <dt className="text-texto-suave md:sr-only">{rotulo}</dt>
      <dd>
        <Valor v={v} inteiro sinal privado={privado} />
      </dd>
    </div>
  );
}
