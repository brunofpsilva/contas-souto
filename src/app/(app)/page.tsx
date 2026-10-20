import Link from "next/link";
import { GraficoSaldo } from "@/components/grafico-saldo";
import { ListaDespesas } from "@/components/lista-despesas";
import { totaisPorCategoria } from "@/lib/agrupar";
import { listarDespesas, obterContas } from "@/lib/dados";
import { dataHora, euros, textoEstado, type TomEstado } from "@/lib/formato";
import { mesCurto, mesPorExtenso } from "@/lib/meses";
import { calcularPrevisao } from "@/lib/previsao";
import { estadoSync } from "@/lib/sync";
import { cn } from "@/lib/utils";

export default async function ResumoPage() {
  const [despesas, contas, sync] = await Promise.all([listarDespesas(), obterContas(), estadoSync()]);
  const p = calcularPrevisao({ despesas, disponivel: contas.disponivel, reserva: contas.reserva });
  const r = p.resumo;
  const estado = textoEstado(r);
  const categorias = totaisPorCategoria(despesas);
  const maxCategoria = Math.max(1, ...categorias.map((c) => c.total));
  const porPagar = despesas.filter((d) => d.estado !== "pago");
  const ultimoMes = p.meses.at(-1)?.mes;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Resumo</h1>
          <Estado tom={estado.tom}>{estado.texto}</Estado>
        </div>
        <p className="text-muted-foreground text-xs">
          {sync.ultimaOk ? (
            <>Saldos de {dataHora(sync.ultimaOk.terminadaEm ?? sync.ultimaOk.iniciadaEm)}</>
          ) : (
            <>
              Sem saldos.{" "}
              <Link href="/contas" className="text-primary underline underline-offset-2">
                Sincronizar com Wallet
              </Link>
            </>
          )}
          {sync.ultimoErro && (
            <Link href="/contas" className="text-destructive ml-2 underline underline-offset-2">
              A última sincronização falhou
            </Link>
          )}
        </p>
      </header>

      <section aria-label="Números principais" className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border md:grid-cols-4">
        <Numero rotulo="Disponível hoje" valor={euros(r.disponivel)} nota={`${contas.contas.filter((c) => c.incluida).length} contas`} />
        <Numero rotulo="Por pagar" valor={euros(r.porPagar)} nota={`${r.nPorPagar} despesa${r.nPorPagar === 1 ? "" : "s"}`} />
        <Numero rotulo="Já pago" valor={euros(r.pago)} nota={`${r.nPagas} despesa${r.nPagas === 1 ? "" : "s"}`} />
        <Numero
          rotulo="Saldo no fim"
          valor={euros(r.saldoFinal)}
          nota={ultimoMes ? mesPorExtenso(ultimoMes) : ""}
          mau={r.saldoFinal != null && r.saldoFinal < 0}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="titulo-grafico" className="bg-card grid gap-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-grafico" className="font-heading font-bold">
              Saldo previsto
            </h2>
            <p className="text-muted-foreground text-xs">ao fim de cada mês, sem as despesas já pagas</p>
          </div>
          {r.disponivel == null ? (
            <p className="text-muted-foreground py-16 text-center text-sm">Sincroniza as contas para ver a previsão.</p>
          ) : (
            <GraficoSaldo
              pontos={p.meses.map((m) => ({ mes: m.mes, saldo: m.saldo ?? 0, saidas: m.saidas, atrasadas: m.atrasadas }))}
              reserva={p.reserva}
            />
          )}
        </section>

        <section aria-labelledby="titulo-meses" className="grid content-start gap-3">
          <h2 id="titulo-meses" className="font-heading font-bold">
            Mês a mês
          </h2>
          <div className="bg-card overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="px-3 py-2 font-medium">Mês</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Saídas</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {p.meses.map((m) => {
                  const negativo = m.saldo != null && m.saldo < 0;
                  const abaixo = !negativo && p.reserva > 0 && m.saldo != null && m.saldo < p.reserva;
                  return (
                    <tr key={m.mes} className="border-b last:border-0">
                      <th scope="row" className="px-3 py-1.5 text-left font-sans font-normal whitespace-nowrap">
                        {mesCurto(m.mes)}
                        {m.mes === p.mesAtual && <span className="text-muted-foreground ml-1.5 text-xs">atual</span>}
                      </th>
                      <td className={cn("px-3 py-1.5 text-right whitespace-nowrap", !m.saidas && "text-muted-foreground")}>
                        {m.saidas ? euros(m.saidas) : "—"}
                        {m.atrasadas > 0 && (
                          <span className="text-destructive block font-sans text-xs">{euros(m.atrasadas)} atrasadas</span>
                        )}
                      </td>
                      <td className={cn("px-3 py-1.5 text-right whitespace-nowrap", negativo && "text-destructive", abaixo && "text-aviso")}>
                        {euros(m.saldo)}
                        {abaixo && <span className="block font-sans text-xs">abaixo da reserva</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section aria-labelledby="titulo-categorias" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-categorias" className="font-heading font-bold">
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
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
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

      <section aria-labelledby="titulo-por-pagar" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-por-pagar" className="font-heading font-bold">
            Despesas por pagar
          </h2>
          <Link href="/despesas" className="text-primary text-sm underline-offset-2 hover:underline">
            Ver todas e adicionar
          </Link>
        </div>
        <ListaDespesas despesas={porPagar} mesAtual={p.mesAtual} vazio="Nada por pagar." />
      </section>
    </>
  );
}

function Numero({ rotulo, valor, nota, mau = false }: { rotulo: string; valor: string; nota?: string; mau?: boolean }) {
  return (
    <div className="bg-card grid min-w-0 gap-1 px-4 py-3">
      <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{rotulo}</p>
      <p className={cn("truncate text-xl font-semibold sm:text-2xl", mau && "text-destructive")}>{valor}</p>
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
    <p role="status" className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold", estilos[tom])}>
      <span className="size-2 rounded-full bg-current" aria-hidden />
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
