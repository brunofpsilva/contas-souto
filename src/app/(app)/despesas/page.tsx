import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LinhaDespesa } from "@/components/linha-despesa";
import { SegmentosLigacoes } from "@/components/segmentos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import { agruparPorMes } from "@/lib/agrupar";
import { cicloDe } from "@/lib/ciclo";
import { listarDespesas, listarDivisoes, obterDatas } from "@/lib/dados";
import { SEM_DIVISAO } from "@/lib/dominio";
import { maiuscula, plural } from "@/lib/formato";
import { mesLongo } from "@/lib/meses";
import { hrefNovaDespesa } from "@/lib/rotas";
import { FiltroDivisao } from "./filtro-divisao";

export const metadata: Metadata = { title: "Despesas" };

// Ao abrir, a lista mostra o que falta pagar (?ver=pagas e ?ver=todas mostram o resto).
const FILTROS = [
  { valor: "por-pagar", texto: "Por pagar" },
  { valor: "pagas", texto: "Pagas" },
  { valor: "todas", texto: "Todas" },
] as const;
type Filtro = (typeof FILTROS)[number]["valor"];

const VAZIO: Record<Filtro, { geral: string; naDivisao: (nome: string) => string }> = {
  "por-pagar": { geral: "Nada por pagar.", naDivisao: (nome) => `Nada por pagar em ${nome}.` },
  pagas: { geral: "Ainda não há despesas pagas.", naDivisao: (nome) => `Sem despesas pagas em ${nome}.` },
  todas: { geral: "Ainda não há despesas.", naDivisao: (nome) => `Sem despesas em ${nome}.` },
};

export default async function DespesasPage({ searchParams }: PageProps<"/despesas">) {
  const { ver, divisao } = await searchParams;
  const filtro: Filtro = FILTROS.find((f) => f.valor === ver)?.valor ?? "por-pagar";
  const [todas, datas, divisoes] = await Promise.all([listarDespesas(), obterDatas(), listarDivisoes()]);
  const mesAtual = cicloDe(new Date());
  // ?divisao=ID ou ?divisao=nenhuma (Sem divisão); outra coisa não filtra.
  const daDivisao = divisao === "nenhuma" ? { id: null, nome: SEM_DIVISAO } : divisoes.find((d) => String(d.id) === divisao);
  const chaveDivisao = daDivisao ? (daDivisao.id == null ? "nenhuma" : String(daDivisao.id)) : "";

  const lista = todas.filter(
    (d) => (filtro === "todas" || (filtro === "pagas") === (d.estado === "pago")) && (!daDivisao || d.divisaoId === daDivisao.id),
  );
  const grupos = agruparPorMes(lista, mesAtual);
  const total = Math.round(lista.reduce((s, d) => s + d.valor, 0) * 100) / 100;

  const href = (f: Filtro, div: string) => {
    const q = new URLSearchParams();
    if (f !== "por-pagar") q.set("ver", f);
    if (div) q.set("divisao", div);
    const t = q.toString();
    return t ? `/despesas?${t}` : "/despesas";
  };
  const opcoesDivisao = [
    { valor: "", texto: "Todas as divisões" },
    ...divisoes.map((d) => ({ valor: String(d.id), texto: d.nome })),
    { valor: "nenhuma", texto: SEM_DIVISAO },
  ].map((o) => ({ ...o, href: href(filtro, o.valor) }));

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,22rem)_minmax(0,16rem)] sm:justify-between">
        <SegmentosLigacoes
          rotulo="Filtrar despesas"
          opcoes={FILTROS.map((f) => ({ href: href(f.valor, chaveDivisao), texto: f.texto, ativa: f.valor === filtro }))}
        />
        {(divisoes.length > 0 || daDivisao) && <FiltroDivisao key={chaveDivisao} valor={chaveDivisao} opcoes={opcoesDivisao} />}
      </div>

      {grupos.length === 0 ? (
        <Card className="grid justify-items-start gap-3 p-4">
          <p>{daDivisao ? VAZIO[filtro].naDivisao(daDivisao.nome) : VAZIO[filtro].geral}</p>
          <Button asChild variant="outline" className="max-sm:w-full">
            <Link href={hrefNovaDespesa(daDivisao?.id != null ? String(daDivisao.id) : null)}>
              <Plus aria-hidden />
              Adicionar despesa
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          <p className="text-texto-suave flex items-baseline justify-between gap-3 px-1 text-sm">
            <span>{plural(lista.length, "despesa")}</span>
            <Valor v={total} className="text-texto font-medium" />
          </p>

          {grupos.map((g) => (
            <section key={g.mes} aria-labelledby={`mes-${g.mes}`} className="grid gap-2">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 id={`mes-${g.mes}`} className="font-semibold">
                  {maiuscula(mesLongo(g.mes))}
                </h2>
                <Valor v={g.porPagar + g.pago} className="text-texto-suave text-sm" />
              </div>
              <Card>
                <ul className="divide-y">
                  {g.despesas.map((d) => (
                    <LinhaDespesa key={d.id} d={d} datas={datas} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
