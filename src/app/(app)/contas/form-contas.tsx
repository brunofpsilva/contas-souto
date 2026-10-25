"use client";

import { useActionState, useState, useTransition } from "react";
import { guardarDefinicoes, type EstadoAcao } from "@/actions/contas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { euros } from "@/lib/formato";
import { PRIVADO } from "@/lib/privacidade";
import { tipoConta } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

interface ContaVista {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  moeda: string;
  incluida: boolean;
}

export function FormContas({
  contas,
  escolhaManual,
  reserva,
}: {
  contas: ContaVista[];
  escolhaManual: boolean;
  reserva: number;
}) {
  const [estado, acao, aGuardar] = useActionState<EstadoAcao, FormData>(guardarDefinicoes, null);
  const [, iniciar] = useTransition();
  const [marcadas, setMarcadas] = useState(() => new Set(contas.filter((c) => c.incluida).map((c) => c.id)));
  // Só passa a escolha manual se mexerem nas caixas (mudar só a reserva não altera a regra).
  const [alterou, setAlterou] = useState(false);
  // Quando o servidor devolve uma escolha nova (p. ex. depois de "voltar ao padrão"), recomeça dela.
  const chave = contas.map((c) => `${c.id}:${c.incluida}`).join("|");
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    setMarcadas(new Set(contas.filter((c) => c.incluida).map((c) => c.id)));
    setAlterou(false);
  }

  const total = Math.round(contas.filter((c) => marcadas.has(c.id)).reduce((s, c) => s + c.saldo, 0) * 100) / 100;
  const outrasMoedas = contas.filter((c) => marcadas.has(c.id) && c.moeda !== "EUR");

  // Marcar ou desmarcar uma conta guarda logo (antes só guardava com o botão, mais abaixo,
  // e quem saía da página perdia a escolha). A reserva enviada é a que está guardada.
  function alternar(id: string, sim: boolean) {
    const n = new Set(marcadas);
    if (sim) n.add(id);
    else n.delete(id);
    setAlterou(true);
    setMarcadas(n);
    const form = new FormData();
    form.set("selecao", "manual");
    form.set("reserva", String(reserva));
    for (const c of n) form.append("conta", c);
    iniciar(() => acao(form));
  }

  return (
    <form action={acao} className="grid gap-8">
      <input type="hidden" name="selecao" value={alterou || escolhaManual ? "manual" : "manter"} />
      <section className="grid gap-3" aria-labelledby="titulo-contas">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-contas" className="font-heading text-lg font-bold">
            Contas que contam
          </h2>
          <p className="text-muted-foreground text-sm">
            {escolhaManual ? "Escolha feita por vocês." : "Por defeito: contas com saldo positivo."}
          </p>
        </div>

        {contas.length === 0 ? (
          <p className="text-muted-foreground bg-card rounded-xl border p-6 text-center text-sm">
            Ainda não há contas. Carrega em <strong>Sincronizar com Wallet</strong>.
          </p>
        ) : (
          <ul className="bg-card divide-y rounded-xl border">
            {contas.map((c) => {
              const id = `conta-${c.id}`;
              return (
                <li key={c.id} className="flex items-center gap-3 pl-4">
                  <Checkbox
                    id={id}
                    name="conta"
                    value={c.id}
                    checked={marcadas.has(c.id)}
                    onCheckedChange={(v) => alternar(c.id, v === true)}
                  />
                  {/* A linha inteira (nome e saldo) marca e desmarca a conta. */}
                  <Label htmlFor={id} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pr-4 font-normal">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate font-medium">{c.nome}</span>
                      <span className="text-muted-foreground text-xs">
                        {tipoConta(c.tipo)}
                        {c.moeda !== "EUR" && ` · ${c.moeda}`}
                      </span>
                    </span>
                    <span className={cn("font-mono text-sm tabular-nums whitespace-nowrap", c.saldo < 0 && "text-destructive", PRIVADO)}>
                      {c.moeda === "EUR" ? euros(c.saldo) : `${c.saldo.toLocaleString("pt-PT")} ${c.moeda}`}
                    </span>
                  </Label>
                </li>
              );
            })}
            <li className="bg-muted/40 flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">Disponível hoje</span>
              <span className={cn("font-mono font-medium tabular-nums", PRIVADO)}>{euros(total)}</span>
            </li>
          </ul>
        )}
        {outrasMoedas.length > 0 && (
          <p className="text-aviso text-sm">
            Atenção: {outrasMoedas.map((c) => `${c.nome} (${c.moeda})`).join(", ")} entra na soma sem conversão para euros.
          </p>
        )}
      </section>

      <section className="grid max-w-sm gap-2" aria-labelledby="titulo-reserva">
        <h2 id="titulo-reserva" className="font-heading text-lg font-bold">
          Reserva mínima
        </h2>
        <p className="text-muted-foreground text-sm">
          Opcional. A app avisa no primeiro mês em que o saldo previsto fica abaixo deste valor.
        </p>
        <div className="relative">
          <Input
            name="reserva"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={reserva ? String(reserva).replace(".", ",") : ""}
            placeholder="0"
            aria-label="Reserva mínima em euros"
            className={cn("pr-8 font-mono", PRIVADO)}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Button type="submit" className="max-sm:h-11" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : "Guardar"}
        </Button>
        {escolhaManual && (
          <Button type="submit" name="modo" value="defeito" variant="ghost" className="max-sm:h-11" disabled={aGuardar}>
            Voltar às contas com saldo positivo
          </Button>
        )}
        <p aria-live="polite" className={cn("text-sm", estado?.ok ? "text-ok" : "text-destructive")}>
          {estado?.mensagem}
        </p>
      </div>
    </form>
  );
}
