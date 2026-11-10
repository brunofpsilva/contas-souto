"use client";

import { TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { guardarContas, type EstadoAcao } from "@/actions/contas";
import { BotaoAtualizar } from "@/components/botao-atualizar";
import { MensagemAcao } from "@/components/mensagem-acao";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Valor } from "@/components/valor";
import { PRIVADO } from "@/lib/privacidade";
import { tipoConta } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

export interface ContaVista {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  moeda: string;
  incluida: boolean;
}

/**
 * As contas do Wallet cujo saldo conta. Marcar ou desmarcar uma conta grava logo (o que se
 * toca grava ao tocar); "Atualizar saldos" vai buscar os valores ao Wallet.
 */
export function ContasWallet({
  contas,
  escolhaManual,
  atualizado,
  falha,
  aPreparar,
}: {
  contas: ContaVista[];
  /** Alguém escolheu as contas à mão; senão, contam as de saldo positivo. */
  escolhaManual: boolean;
  /** "Atualizado 10 nov, 09:14", ou null se nunca houve saldos. */
  atualizado: string | null;
  /** Frase do último erro, se a última atualização falhou. */
  falha: string | null;
  /** O Wallet ainda estava a preparar dados na última atualização. */
  aPreparar: boolean;
}) {
  const [resposta, setResposta] = useState<EstadoAcao>(null);
  const [aGravar, iniciar] = useTransition();
  const [marcadas, setMarcadas] = useState(() => new Set(contas.filter((c) => c.incluida).map((c) => c.id)));
  // Quando o servidor devolve uma escolha nova (por exemplo depois de repor a automática), recomeça dela.
  const chave = contas.map((c) => `${c.id}:${c.incluida}`).join("|");
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    setMarcadas(new Set(contas.filter((c) => c.incluida).map((c) => c.id)));
  }

  const total = Math.round(contas.filter((c) => marcadas.has(c.id)).reduce((s, c) => s + c.saldo, 0) * 100) / 100;
  const outrasMoedas = contas.filter((c) => marcadas.has(c.id) && c.moeda !== "EUR");

  function gravar(escolha: string[] | null) {
    iniciar(async () => setResposta(await guardarContas(escolha)));
  }

  function alternar(id: string, sim: boolean) {
    const n = new Set(marcadas);
    if (sim) n.add(id);
    else n.delete(id);
    setMarcadas(n);
    gravar([...n]);
  }

  return (
    <div className="grid gap-3">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-4">
          <p className="text-texto-suave text-sm">{atualizado ?? "Ainda sem saldos."}</p>
          <BotaoAtualizar classeMensagem="basis-full" />
        </div>

        {contas.length > 0 && (
          <ul className="border-t">
            {contas.map((c) => {
              const id = `conta-${c.id}`;
              return (
                <li key={c.id} className="flex items-center gap-3 border-b pl-4">
                  <Checkbox id={id} checked={marcadas.has(c.id)} onCheckedChange={(v) => alternar(c.id, v === true)} />
                  {/* A linha inteira (nome e saldo) marca e desmarca a conta. */}
                  <Label htmlFor={id} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pr-4 font-normal">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-base font-medium">{c.nome}</span>
                      <span className="text-texto-suave text-sm">
                        {tipoConta(c.tipo)}
                        {c.moeda !== "EUR" && ` · ${c.moeda}`}
                      </span>
                    </span>
                    {c.moeda === "EUR" ? (
                      <Valor v={c.saldo} privado className="text-base" />
                    ) : (
                      <span className={cn("text-base tabular-nums whitespace-nowrap", PRIVADO)}>
                        {c.saldo.toLocaleString("pt-PT")} {c.moeda}
                      </span>
                    )}
                  </Label>
                </li>
              );
            })}
            <li className="bg-superficie-suave/50 flex min-h-12 items-center justify-between gap-3 px-4 font-medium">
              <span>Saldo hoje</span>
              <Valor v={total} privado />
            </li>
          </ul>
        )}
      </Card>

      {falha && (
        <Alert variant="negativo" role="alert">
          <TriangleAlert aria-hidden />
          <span>{falha}</span>
        </Alert>
      )}
      {!falha && aPreparar && (
        <Alert variant="aviso">
          <TriangleAlert aria-hidden />
          <span>O Wallet ainda está a preparar dados. Os saldos podem mudar.</span>
        </Alert>
      )}
      {outrasMoedas.length > 0 && (
        <Alert variant="aviso">
          <TriangleAlert aria-hidden />
          <span>{outrasMoedas.map((c) => `${c.nome} (${c.moeda})`).join(", ")} soma sem conversão para euros.</span>
        </Alert>
      )}

      {contas.length > 0 && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {escolhaManual ? (
            <Button variant="ghost" className="-ml-4" disabled={aGravar} onClick={() => gravar(null)}>
              Repor seleção automática
            </Button>
          ) : (
            <p className="text-texto-suave text-sm">Automático: contas com saldo positivo.</p>
          )}
          <MensagemAcao estado={resposta} />
        </div>
      )}
    </div>
  );
}
