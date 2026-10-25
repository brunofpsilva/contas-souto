"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import type { EstadoAcao } from "@/actions/contas";
import { apagarDivisao, criarDivisao, guardarDivisoes } from "@/actions/orcamento";
import { BarraOrcamento, LegendaOrcamento, TextoRestante } from "@/components/barra-orcamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITE_NOME_DIVISAO } from "@/lib/dominio";
import { euros } from "@/lib/formato";
import type { LinhaOrcamento } from "@/lib/orcamento";
import { cn } from "@/lib/utils";

const valorCampo = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

/** Nomes e orçamentos de todas as divisões, guardados de uma vez; cada uma pode ser apagada. */
export function FormDivisoes({ linhas, naoAplicavel }: { linhas: LinhaOrcamento[]; naoAplicavel: LinhaOrcamento }) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(guardarDivisoes, null);
  const [aviso, setAviso] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const mensagem = aviso ?? estado;

  return (
    <section aria-labelledby="titulo-divisoes" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-divisoes" className="font-heading text-lg font-bold">
          Divisões
        </h2>
        <LegendaOrcamento />
      </div>

      {/* A chave muda quando o que está guardado muda, para os campos mostrarem o que ficou. */}
      <form
        key={linhas.map((l) => `${l.id}:${l.nome}:${l.orcamento}`).join("|")}
        action={(f) => {
          setAviso(null);
          return acao(f);
        }}
        className="grid gap-3"
      >
        <ul className="bg-card divide-y rounded-xl border">
          {linhas.map((l) => (
            <LinhaDivisao key={l.id} l={l} desativado={aGuardar} aoApagar={setAviso} />
          ))}
          <li className="grid gap-2 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="font-medium">{naoAplicavel.nome}</span>
              <Totais l={naoAplicavel} />
            </div>
            <p className="text-muted-foreground text-xs">Despesas sem divisão. Não tem orçamento e não conta para o orçamento geral.</p>
          </li>
        </ul>

        {/* Com muitas divisões, o botão fica sempre à vista no fundo do ecrã (por cima da barra de navegação). */}
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <Button type="submit" className="max-sm:h-11 max-sm:flex-1" disabled={aGuardar || linhas.length === 0}>
            {aGuardar ? "A guardar…" : "Guardar orçamento"}
          </Button>
          <p aria-live="polite" className={cn("text-sm", mensagem?.ok ? "text-ok" : "text-destructive")}>
            {mensagem?.mensagem}
          </p>
        </div>
      </form>
    </section>
  );
}

function LinhaDivisao({
  l,
  desativado,
  aoApagar,
}: {
  l: LinhaOrcamento;
  desativado: boolean;
  aoApagar: (r: { ok: boolean; mensagem: string }) => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [aApagar, iniciar] = useTransition();
  const id = l.id!;

  function apagar() {
    iniciar(async () => {
      const r = await apagarDivisao(id);
      aoApagar(r);
      setConfirmar(false);
    });
  }

  return (
    <li className="grid gap-3 px-4 py-3">
      {/* Telemóvel: nome numa linha; orçamento e Apagar lado a lado por baixo. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <div className="col-span-2 grid gap-1.5 sm:col-span-1">
          <Label htmlFor={`nome-${id}`} className="text-muted-foreground text-xs">
            Nome
          </Label>
          <Input id={`nome-${id}`} name={`nome:${id}`} defaultValue={l.nome} maxLength={LIMITE_NOME_DIVISAO} required className="font-medium" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`orcamento-${id}`} className="text-muted-foreground text-xs">
            Orçamento máximo
          </Label>
          <div className="relative">
            <Input
              id={`orcamento-${id}`}
              name={`orcamento:${id}`}
              inputMode="decimal"
              autoComplete="off"
              defaultValue={valorCampo(l.orcamento)}
              placeholder="sem orçamento"
              className="pr-8 font-mono tabular-nums"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
          </div>
        </div>
        <div className={cn("flex items-center justify-end gap-1", confirmar && "max-sm:col-span-2")}>
          {confirmar ? (
            <div
              role="group"
              aria-label={`Confirmar apagar ${l.nome}`}
              className="flex flex-wrap items-center gap-2 max-sm:w-full sm:justify-end sm:gap-1"
            >
              <span className="text-sm max-sm:w-full">
                Apagar?{l.nDespesas > 0 && ` ${l.nDespesas} despesa${l.nDespesas === 1 ? " passa" : "s passam"} a Não aplicável.`}
              </span>
              <Button type="button" size="sm" variant="destructive" className="max-sm:h-10 max-sm:flex-1" disabled={aApagar} onClick={apagar}>
                {aApagar ? "A apagar…" : "Sim, apagar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="max-sm:h-10"
                disabled={aApagar}
                onClick={() => setConfirmar(false)}
                autoFocus
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive max-sm:h-11"
              disabled={desativado}
              onClick={() => setConfirmar(true)}
              aria-label={`Apagar ${l.nome}`}
            >
              Apagar
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-1.5">
        <BarraOrcamento l={l} />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <Totais l={l} />
          <TextoRestante l={l} />
        </div>
      </div>
    </li>
  );
}

/** "3 despesas · pago 100 € · por pagar 200 € · 300 €", com ligação para as despesas da divisão. */
function Totais({ l }: { l: LinhaOrcamento }) {
  const href = `/despesas?divisao=${l.id ?? "nenhuma"}`;
  return (
    <span className="text-muted-foreground font-mono text-xs tabular-nums">
      <Link href={href} className="text-primary -my-2 inline-block py-2 font-sans underline-offset-2 hover:underline">
        {l.nDespesas} despesa{l.nDespesas === 1 ? "" : "s"}
      </Link>
      {l.pago > 0 && <> · pago {euros(l.pago)}</>}
      {l.porPagar > 0 && <> · por pagar {euros(l.porPagar)}</>}
      <span className="text-foreground ml-2">
        {euros(l.total)}
        {l.orcamento != null && <span className="text-muted-foreground"> / {euros(l.orcamento)}</span>}
      </span>
    </span>
  );
}

export function FormNovaDivisao() {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(criarDivisao, null);
  // Depois de adicionar, limpa os campos (com erro, mantém o que se escreveu).
  const chave = estado?.ok ? estado.quando : "nova";

  return (
    <form key={chave} action={acao} className="bg-card grid gap-3 rounded-xl border p-4" aria-labelledby="titulo-nova-divisao">
      <h2 id="titulo-nova-divisao" className="text-sm font-semibold">
        Nova divisão
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <div className="col-span-2 grid gap-1.5 sm:col-span-1">
          <Label htmlFor="nova-nome" className="text-muted-foreground text-xs">
            Nome
          </Label>
          <Input id="nova-nome" name="nome" maxLength={LIMITE_NOME_DIVISAO} required placeholder="Ex.: Casa de banho" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nova-orcamento" className="text-muted-foreground text-xs">
            Orçamento máximo
          </Label>
          <div className="relative">
            <Input id="nova-orcamento" name="orcamento" inputMode="decimal" autoComplete="off" placeholder="opcional" className="pr-8 font-mono tabular-nums" />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
          </div>
        </div>
        <Button type="submit" variant="outline" className="h-11" disabled={aGuardar}>
          {aGuardar ? "A adicionar…" : "Adicionar"}
        </Button>
      </div>
      <p aria-live="polite" className={cn("text-sm", estado?.ok ? "text-ok" : "text-destructive")}>
        {estado?.mensagem}
      </p>
    </form>
  );
}
