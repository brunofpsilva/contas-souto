"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { EstadoAcao } from "@/actions/contas";
import { apagarDivisao, criarDivisao, guardarDivisoes } from "@/actions/orcamento";
import { BarraAcoes } from "@/components/barra-acoes";
import { Confirmar } from "@/components/confirmar";
import { MensagemAcao } from "@/components/mensagem-acao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITE_NOME_DIVISAO } from "@/lib/dominio";
import { plural } from "@/lib/formato";

export interface DivisaoEditavel {
  id: number;
  nome: string;
  /** null = sem limite */
  limite: number | null;
  nDespesas: number;
}

const valorCampo = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

/** Nomes e limites de todas as divisões, gravados com um só "Guardar". Apagar pede confirmação. */
export function FormDivisoes({ divisoes }: { divisoes: DivisaoEditavel[] }) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(guardarDivisoes, null);
  const [apagada, setApagada] = useState<{ ok: boolean; mensagem: string } | null>(null);

  return (
    // A chave muda quando o que está guardado muda, para os campos mostrarem o que ficou.
    <form
      key={divisoes.map((d) => `${d.id}:${d.nome}:${d.limite}`).join("|")}
      action={(f) => {
        setApagada(null);
        return acao(f);
      }}
      className="grid gap-3"
    >
      <Card>
        <ul className="divide-y">
          {divisoes.map((d) => (
            <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2 gap-y-3 p-4">
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor={`nome-${d.id}`}>Nome</Label>
                <Input id={`nome-${d.id}`} name={`nome:${d.id}`} defaultValue={d.nome} maxLength={LIMITE_NOME_DIVISAO} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`limite-${d.id}`}>Limite</Label>
                <CampoEuros id={`limite-${d.id}`} name={`orcamento:${d.id}`} defaultValue={valorCampo(d.limite)} placeholder="Sem limite" />
              </div>
              <Confirmar
                titulo={`Apagar «${d.nome}»?`}
                descricao={d.nDespesas > 0 ? `${plural(d.nDespesas, "despesa")} ${d.nDespesas === 1 ? "fica" : "ficam"} sem divisão.` : undefined}
                textoConfirmar="Apagar divisão"
                aoConfirmar={async () => setApagada(await apagarDivisao(d.id))}
              >
                <Button type="button" variant="ghost" size="icon" className="text-negativo" aria-label={`Apagar ${d.nome}`} disabled={aGuardar}>
                  <Trash2 aria-hidden />
                </Button>
              </Confirmar>
            </li>
          ))}
        </ul>
      </Card>

      <BarraAcoes>
        <MensagemAcao estado={apagada ?? estado} className="md:order-last" />
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : "Guardar"}
        </Button>
      </BarraAcoes>
    </form>
  );
}

/** Uma divisão nova: nome e, se se quiser, um limite. */
export function FormNovaDivisao() {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(criarDivisao, null);
  // Depois de adicionar, limpa os campos (com erro, mantém o que se escreveu).
  const chave = estado?.ok ? estado.quando : "nova";

  return (
    <Card className="p-4">
      <form key={chave} action={acao} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="nova-nome">Nome</Label>
          <Input id="nova-nome" name="nome" maxLength={LIMITE_NOME_DIVISAO} required placeholder="Ex.: Casa de banho" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nova-limite">Limite (opcional)</Label>
          <CampoEuros id="nova-limite" name="orcamento" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit" variant="outline" className="max-sm:w-full" disabled={aGuardar}>
            <Plus aria-hidden />
            {aGuardar ? "A adicionar…" : "Adicionar divisão"}
          </Button>
          <MensagemAcao estado={estado} />
        </div>
      </form>
    </Card>
  );
}

function CampoEuros(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input inputMode="decimal" autoComplete="off" className="pr-8 tabular-nums" {...props} />
      <span className="text-texto-suave pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
    </div>
  );
}
