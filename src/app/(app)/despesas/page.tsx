import { Plus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListaDespesas } from "@/components/lista-despesas";
import { Button } from "@/components/ui/button";
import { listarDespesas, listarDivisoes, obterDatas } from "@/lib/dados";
import { SEM_DIVISAO } from "@/lib/dominio";
import { euros } from "@/lib/formato";
import { cicloDe } from "@/lib/ciclo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Despesas" };

const FILTROS = [
  { valor: "todas", texto: "Todas" },
  { valor: "por-pagar", texto: "Por pagar" },
  { valor: "pagas", texto: "Pagas" },
] as const;

export default async function DespesasPage({ searchParams }: PageProps<"/despesas">) {
  const { ver, divisao } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === ver)?.valor ?? "todas";
  const [todas, datas, divisoes] = await Promise.all([listarDespesas(), obterDatas(), listarDivisoes()]);
  const mesAtual = cicloDe(new Date());
  // ?divisao=ID ou ?divisao=nenhuma (Não aplicável); outra coisa não filtra.
  const daDivisao = divisao === "nenhuma" ? { id: null, nome: SEM_DIVISAO } : divisoes.find((d) => String(d.id) === divisao);
  const lista = todas.filter(
    (d) =>
      (filtro === "todas" || (filtro === "pagas") === (d.estado === "pago")) &&
      (!daDivisao || d.divisaoId === daDivisao.id),
  );
  const ligacao = (f: string) => {
    const q = new URLSearchParams();
    if (f !== "todas") q.set("ver", f);
    if (daDivisao) q.set("divisao", daDivisao.id == null ? "nenhuma" : String(daDivisao.id));
    const t = q.toString();
    return t ? `/despesas?${t}` : "/despesas";
  };
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
          <Link href={daDivisao?.id != null ? `/despesas/nova?divisao=${daDivisao.id}` : "/despesas/nova"}>
            <Plus aria-hidden />
            Nova despesa
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* No telemóvel os filtros ocupam a largura toda, com o mesmo tamanho cada. */}
        <nav aria-label="Filtrar despesas" className="bg-secondary grid w-full grid-cols-3 gap-1 rounded-lg p-1 sm:flex sm:w-fit">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={ligacao(f.valor)}
              aria-current={filtro === f.valor ? "page" : undefined}
              className={cn(
                "flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
                filtro === f.valor ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.texto}
            </Link>
          ))}
        </nav>
        {daDivisao && (
          <p className="bg-secondary inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pr-0.5 pl-3 text-sm">
            <span className="truncate">
              Divisão: <span className="font-medium">{daDivisao.nome}</span>
            </span>
            <Link
              href={filtro === "todas" ? "/despesas" : `/despesas?ver=${filtro}`}
              className="text-muted-foreground hover:text-foreground hover:bg-card flex size-8 shrink-0 items-center justify-center rounded-full"
              aria-label="Ver todas as divisões"
            >
              <X className="size-4" aria-hidden />
            </Link>
          </p>
        )}
      </div>

      <ListaDespesas
        despesas={lista}
        mesAtual={mesAtual}
        datas={datas}
        vazio={
          daDivisao
            ? `Não há despesas${filtro === "pagas" ? " pagas" : filtro === "por-pagar" ? " por pagar" : ""} em ${daDivisao.nome}.`
            : filtro === "pagas" ? "Ainda não há despesas pagas." : filtro === "por-pagar" ? "Nada por pagar." : "Ainda não há despesas. Adiciona a primeira."
        }
      />
    </>
  );
}
