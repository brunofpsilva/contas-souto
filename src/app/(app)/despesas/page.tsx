import type { Metadata } from "next";
import Link from "next/link";
import { ListaDespesas } from "@/components/lista-despesas";
import { Button } from "@/components/ui/button";
import { listarDespesas } from "@/lib/dados";
import { euros } from "@/lib/formato";
import { mesDe } from "@/lib/meses";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Despesas" };

const FILTROS = [
  { valor: "todas", texto: "Todas" },
  { valor: "por-pagar", texto: "Por pagar" },
  { valor: "pagas", texto: "Pagas" },
] as const;

export default async function DespesasPage({ searchParams }: PageProps<"/despesas">) {
  const { ver } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === ver)?.valor ?? "todas";
  const todas = await listarDespesas();
  const mesAtual = mesDe(new Date());
  const lista = todas.filter((d) => filtro === "todas" || (filtro === "pagas") === (d.estado === "pago"));
  const total = lista.reduce((s, d) => s + d.valor, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground text-sm">
            {lista.length} despesa{lista.length === 1 ? "" : "s"} · <span className="font-mono tabular-nums">{euros(total)}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/despesas/nova">Nova despesa</Link>
        </Button>
      </div>

      <nav aria-label="Filtrar despesas" className="bg-secondary flex w-fit gap-1 rounded-lg p-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "todas" ? "/despesas" : `/despesas?ver=${f.valor}`}
            aria-current={filtro === f.valor ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium",
              filtro === f.valor ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.texto}
          </Link>
        ))}
      </nav>

      <ListaDespesas
        despesas={lista}
        mesAtual={mesAtual}
        vazio={filtro === "pagas" ? "Ainda não há despesas pagas." : filtro === "por-pagar" ? "Nada por pagar." : "Ainda não há despesas. Adiciona a primeira."}
      />
    </>
  );
}
