import Link from "next/link";
import { BarraOrcamento, LegendaOrcamento, TextoRestante } from "@/components/barra-orcamento";
import { ListaDespesas } from "@/components/lista-despesas";
import { totaisPorCategoria } from "@/lib/agrupar";
import { listarDespesas, listarDivisoes, obterContas, obterDatas, obterTendencia } from "@/lib/dados";
import { dataCurta, MARCOS } from "@/lib/escritura";
import { dataHora, euros, maiuscula, textoEstado, type TomEstado } from "@/lib/formato";
import { mesPorExtenso } from "@/lib/meses";
import { PRIVADO } from "@/lib/privacidade";
import { calcularOrcamento } from "@/lib/orcamento";
import { calcularPrevisao } from "@/lib/previsao";
import { estadoSync } from "@/lib/sync";
import { cn } from "@/lib/utils";

export default async function ResumoPage() {
  const [despesas, contas, sync, datas, tendencia, divisoes] = await Promise.all([
    listarDespesas(),
    obterContas(),
    estadoSync(),
    obterDatas(),
    obterTendencia(),
    listarDivisoes(),
  ]);
  const p = calcularPrevisao({
    despesas,
    disponivel: contas.disponivel,
    reserva: contas.reserva,
    ...datas,
    fluxos: tendencia.fluxos,
  });
  const r = p.resumo;
  const estado = textoEstado(r, p);
  const categorias = totaisPorCategoria(despesas);
  const maxCategoria = Math.max(1, ...categorias.map((c) => c.total));
  const porPagar = despesas.filter((d) => d.estado !== "pago");
  const orcamento = calcularOrcamento(divisoes, despesas);
  // Só as divisões com orçamento ou com despesas (e Sem divisão se tiver despesas).
  const linhasOrcamento = [...orcamento.divisoes, orcamento.naoAplicavel].filter((l) => l.orcamento != null || l.nDespesas > 0);
  const nContas = contas.contas.filter((c) => c.incluida).length;
  const ultimoMes = p.meses.at(-1);
  // No topo: o saldo depois do último marco (a frase da previsão mostra também o fim).
  const saldoFinal = p.fim?.depois ? p.fim.depois.base : ultimoMes ? ultimoMes.saldo : r.disponivel;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="space-y-2">
          <Estado tom={estado.tom}>
            {estado.valor ? (
              <span>
                {estado.texto.slice(0, -estado.valor.length)}
                <span className={PRIVADO}>{estado.valor}</span>
              </span>
            ) : (
              estado.texto
            )}
          </Estado>
        </div>
        <p className="text-muted-foreground text-xs">
          {sync.ultimaOk ? (
            <>Saldos de {dataHora(sync.ultimaOk.terminadaEm ?? sync.ultimaOk.iniciadaEm)}</>
          ) : (
            <>
              Sem saldos.{" "}
              <Link href="/definicoes" className="text-primary underline underline-offset-2">
                Sincronizar com Wallet
              </Link>
            </>
          )}
          {sync.ultimoErro && (
            <Link href="/definicoes" className="text-destructive ml-2 underline underline-offset-2">
              A última sincronização falhou
            </Link>
          )}
        </p>
      </header>

      <section aria-label="Números principais" className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border md:grid-cols-4">
        <Numero rotulo="Disponível hoje" valor={euros(r.disponivel)} privado nota={`${nContas} conta${nContas === 1 ? "" : "s"}`} />
        <Numero rotulo="Por pagar" valor={euros(r.porPagar)} nota={`${r.nPorPagar} despesa${r.nPorPagar === 1 ? "" : "s"}`} />
        <Numero rotulo="Já pago" valor={euros(r.pago)} nota={`${r.nPagas} despesa${r.nPagas === 1 ? "" : "s"}`} />
        <Numero
          rotulo={p.fim ? maiuscula(MARCOS[p.fim.tipo].depois) : "Saldo no fim"}
          valor={euros(saldoFinal)}
          nota={p.fim ? dataCurta(p.fim.data) : ultimoMes ? mesPorExtenso(ultimoMes.mes) : ""}
          mau={saldoFinal != null && saldoFinal < 0}
          privado
        />
      </section>

      {!p.escritura && (
        <p className="text-muted-foreground text-sm">
          {p.fim
            ? "Sem data da escritura, a previsão vai até à conclusão da obra."
            : "Sem data da escritura nem da conclusão da obra, a previsão mostra os próximos meses."}{" "}
          <Link href="/definicoes" className="text-primary underline underline-offset-2">
            {p.fim ? "Definir a data da escritura" : "Definir as datas"}
          </Link>
        </p>
      )}

      <section aria-labelledby="titulo-categorias" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-categorias" className="font-bold">
            Por categoria
          </h2>
          <Legenda />
        </div>
        {categorias.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ainda não há despesas.</p>
        ) : (
          <ul className="bg-card grid gap-4 rounded-xl border p-4">
            {categorias.map((c) => (
              <li key={c.categoria} className="grid gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                  <span className="font-medium">{c.categoria}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {c.pago > 0 && <>pago {euros(c.pago)}</>}
                    {c.pago > 0 && c.porPagar > 0 && " · "}
                    {c.porPagar > 0 && <>por pagar {euros(c.porPagar)}</>}
                    <span className="text-foreground ml-2">{euros(c.total)}</span>
                  </span>
                </div>
                <div className="flex h-2.5 gap-0.5" aria-hidden>
                  {c.pago > 0 && (
                    <span className="bg-grafico-1 last:rounded-r-[4px]" style={{ width: `${(c.pago / maxCategoria) * 100}%` }} />
                  )}
                  {c.porPagar > 0 && (
                    <span className="bg-grafico-2 rounded-r-[4px]" style={{ width: `${(c.porPagar / maxCategoria) * 100}%` }} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-divisoes" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-divisoes" className="font-bold">
            Por divisão
          </h2>
          <Link href="/orcamento" className="text-primary -my-2 py-2 text-sm underline-offset-2 hover:underline">
            Editar orçamento
          </Link>
        </div>
        {linhasOrcamento.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ainda não há orçamento por divisão.{" "}
            <Link href="/orcamento" className="text-primary underline underline-offset-2">
              Definir o orçamento
            </Link>
          </p>
        ) : (
          <div className="bg-card grid gap-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3 text-sm">
              <span>
                <span className="font-medium">Orçamento geral</span>{" "}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {euros(orcamento.geral.total)} de {euros(orcamento.geral.orcamento)}
                </span>
              </span>
              <TextoRestante l={orcamento.geral} className="text-xs" />
            </div>
            <ul className="grid gap-4">
              {linhasOrcamento.map((l) => (
                <li key={l.id ?? "nenhuma"} className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                    <span className="font-medium">{l.nome}</span>
                    <span className="text-xs tabular-nums">
                      {euros(l.total)}
                      {l.orcamento != null && <span className="text-muted-foreground"> / {euros(l.orcamento)}</span>}
                      <TextoRestante l={l} className="ml-2" />
                    </span>
                  </div>
                  <BarraOrcamento l={l} />
                </li>
              ))}
            </ul>
            <LegendaOrcamento />
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-por-pagar" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-por-pagar" className="font-bold">
            Despesas por pagar
          </h2>
          <Link href="/despesas" className="text-primary -my-2 py-2 text-sm underline-offset-2 hover:underline">
            Ver todas e adicionar
          </Link>
        </div>
        <ListaDespesas despesas={porPagar} mesAtual={p.mesAtual} datas={datas} vazio="Nada por pagar." />
      </section>
    </>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
  mau = false,
  privado = false,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  mau?: boolean;
  /** Desfocado quando os saldos estão escondidos. */
  privado?: boolean;
}) {
  return (
    <div className="bg-card grid min-w-0 content-start gap-1 px-3 py-3 sm:px-4">
      <p className="text-muted-foreground text-[0.6875rem] leading-tight font-semibold tracking-wider uppercase sm:text-xs">{rotulo}</p>
      <p
        className={cn(
          "truncate text-lg font-semibold tabular-nums min-[400px]:text-xl sm:text-2xl",
          mau && "text-destructive",
          privado && PRIVADO,
        )}
      >
        {valor}
      </p>
      {nota && <p className="text-muted-foreground truncate text-xs first-letter:uppercase">{nota}</p>}
    </div>
  );
}

function Estado({ tom, children }: { tom: TomEstado; children: React.ReactNode }) {
  const estilos: Record<TomEstado, string> = {
    ok: "bg-ok-suave text-ok",
    aviso: "bg-aviso-suave text-aviso",
    mau: "bg-mau-suave text-destructive",
    neutro: "bg-secondary text-muted-foreground",
  };
  return (
    // Cantos menos redondos para não ficar estranho quando o texto ocupa duas linhas no telemóvel.
    <p role="status" className={cn("inline-flex items-start gap-2 rounded-2xl px-3 py-1.5 text-sm font-semibold", estilos[tom])}>
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </p>
  );
}

function Legenda() {
  return (
    <p className="text-muted-foreground flex gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="bg-grafico-1 size-2.5 rounded-[3px]" aria-hidden />
        Pago
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-grafico-2 size-2.5 rounded-[3px]" aria-hidden />
        Por pagar
      </span>
    </p>
  );
}
