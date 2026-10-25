import { dataCurta, MARCOS } from "@/lib/escritura";
import { euros } from "@/lib/formato";
import { mesCurto, mesPorExtenso } from "@/lib/meses";
import type { Previsao } from "@/lib/previsao";
import { PRIVADO } from "@/lib/privacidade";
import type { CicloAtual, GastoCiclo, RendimentoAnual } from "@/lib/tendencia";
import { cn } from "@/lib/utils";

/** "2026-10-25" → "25 out" */
const diaMes = (dia: string) => dataCurta(dia).replace(/ \d{4}$/, "");
const inteiro = (v: number) => euros(v, { inteiro: true });
const menos = (v: number) => (v ? `−${inteiro(v)}` : "—");
const mais = (v: number) => (v ? `+${inteiro(v)}` : "—");

interface Linha {
  chave: string;
  rotulo: string;
  /** "Dezembro de 2026" na lista do telemóvel, onde há espaço. */
  rotuloLongo: string;
  notas: React.ReactNode[];
  entra: number;
  gastos: number;
  casa: number;
  saldo: number | null;
  destaque?: boolean;
}

/** Saldo previsto mês a mês até ao último marco, ou até à última despesa se for depois. */
export function ExtratoPrevisto({
  p,
  anuais,
  ciclo,
  gastosPorCiclo,
  grafico,
}: {
  p: Previsao;
  anuais: RendimentoAnual[];
  ciclo?: CicloAtual;
  gastosPorCiclo?: GastoCiclo[];
  grafico?: React.ReactNode;
}) {
  /** O último marco (a previsão pode continuar até à última despesa). */
  const e = p.fim;
  const disponivel = p.resumo.disponivel;

  const linhas: Linha[] = [];
  for (const m of p.meses) {
    const notas: React.ReactNode[] = [];
    if (m.mes === p.mesAtual && p.comFluxos && ciclo) {
      notas.push(
        ciclo.diasQueFaltam === 1
          ? `último dia do ciclo (${diaMes(ciclo.fim)})`
          : `faltam ${ciclo.diasQueFaltam} dias do ciclo (até ${diaMes(ciclo.fim)})`,
      );
    }
    if (m.mes !== p.mesAtual) {
      for (const a of anuais) {
        if (a.valor > 0 && a.mesOrigem.slice(5) === m.mes.slice(5)) 
          notas.push(
            <>
              inclui {a.nome} <span className={PRIVADO}>{inteiro(a.valor)}</span>
            </>,
          );
      }
    }
    if (gastosPorCiclo?.find((g) => g.mes === m.mes)?.editado != null) notas.push("gastos e renda com valor teu");
    if (m.atrasadas > 0) notas.push(`${inteiro(m.atrasadas)} em atraso`);
    // A linha do mês mostra o saldo antes dos marcos; cada marco tem a sua linha a seguir.
    const marcos = p.marcos.filter((x) => x.mes === m.mes);
    linhas.push({
      chave: m.mes,
      rotulo: mesCurto(m.mes),
      rotuloLongo: mesPorExtenso(m.mes),
      notas,
      entra: m.entradasPrevistas,
      gastos: m.saidasPrevistas,
      casa: m.saidas - m.nosMarcos,
      saldo: marcos[0]?.antes ? marcos[0].antes.base : m.saldo,
    });
    for (const x of marcos) {
      linhas.push({
        chave: x.tipo,
        rotulo: `${MARCOS[x.tipo].titulo} · ${diaMes(x.data)}`,
        rotuloLongo: `${MARCOS[x.tipo].titulo} · ${diaMes(x.data)}`,
        notas: [`${x.nPorPagar} despesa${x.nPorPagar === 1 ? "" : "s"} por pagar`],
        entra: 0,
        gastos: 0,
        casa: x.porPagar,
        saldo: x.depois ? x.depois.base : null,
        destaque: true,
      });
    }
  }

  const final = linhas.at(-1)?.saldo ?? disponivel;
  const total = {
    entra: linhas.reduce((s, l) => s + l.entra, 0),
    gastos: linhas.reduce((s, l) => s + l.gastos, 0),
    casa: linhas.reduce((s, l) => s + l.casa, 0),
  };
  const folga = final != null && p.reserva > 0 ? final - p.reserva : null;
  const ultimoMes = p.meses.at(-1)?.mes ?? p.mesAtual;
  // Com despesas depois do último marco, a previsão continua até ao mês da última.
  const continua = e != null && ultimoMes > e.mes;
  const noFim = `no fim de ${mesPorExtenso(ultimoMes)}`;
  const titulo = !e ? "Saldo previsto" : continua ? `Até ao fim de ${mesPorExtenso(ultimoMes)}` : `Até à ${MARCOS[e.tipo].nome} · ${dataCurta(e.data)}`;

  return (
    <section aria-labelledby="titulo-extrato" className="bg-card grid gap-4 rounded-xl border p-4">
      <div className="grid gap-1">
        <h2 id="titulo-extrato" className="font-heading font-bold">
          {titulo}
        </h2>
        {final != null && disponivel != null && (
          <p className="text-sm">
            {e && continua && e.depois ? (
              <>
                Ficam <strong className={cn("font-mono tabular-nums", PRIVADO)}>{inteiro(e.depois.base)}</strong> depois da{" "}
                {MARCOS[e.tipo].nome} e <strong className={cn("font-mono tabular-nums", PRIVADO)}>{inteiro(final)}</strong> {noFim}
              </>
            ) : (
              <>
                Ficam <strong className={cn("font-mono tabular-nums", PRIVADO)}>{inteiro(final)}</strong>{" "}
                {e ? `depois da ${MARCOS[e.tipo].nome}` : noFim}
              </>
            )}
            {folga != null && (
              <span className={cn(folga < 0 ? "text-aviso font-medium" : "text-muted-foreground")}>
                , <span className={PRIVADO}>{inteiro(Math.abs(folga))}</span> {folga < 0 ? "abaixo" : "acima"} da reserva de{" "}
                <span className={PRIVADO}>{inteiro(p.reserva)}</span>
              </span>
            )}
            .
          </p>
        )}
      </div>

      {grafico}

      {disponivel == null ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Sincroniza as contas para ver a previsão.</p>
      ) : (
        <>
        {/* Telemóvel: uma linha por mês com o saldo à direita e os movimentos por baixo. */}
        <ol aria-label="Saldo previsto mês a mês" className="-mx-4 border-y sm:hidden">
          <li className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
            <span className="text-muted-foreground text-sm">Hoje</span>
            <span className="font-mono text-sm tabular-nums">
              <span className={PRIVADO}>{inteiro(disponivel)}</span>
            </span>
          </li>
          {linhas.map((l) => {
            const negativo = l.saldo != null && l.saldo < 0;
            const abaixo = !negativo && p.reserva > 0 && l.saldo != null && l.saldo < p.reserva;
            return (
              <li key={l.chave} className={cn("grid gap-1 border-b px-4 py-2.5", l.destaque && "bg-secondary/60")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cn("text-sm first-letter:uppercase", l.destaque && "font-medium")}>{l.rotuloLongo}</span>
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums whitespace-nowrap",
                      l.destaque && "font-semibold",
                      negativo && "text-destructive",
                      abaixo && "text-aviso",
                    )}
                  >
                    <span className={PRIVADO}>{euros(l.saldo, { inteiro: true })}</span>
                  </span>
                </div>
                <Movimentos entra={p.comFluxos ? l.entra : 0} gastos={p.comFluxos ? l.gastos : 0} casa={l.casa} />
                {(l.notas.length > 0 || abaixo) && (
                  <div className="text-muted-foreground grid gap-0.5 text-xs">
                    {l.notas.map((n, i) => (
                      <span key={i}>{n}</span>
                    ))}
                    {abaixo && <span className="text-aviso">abaixo da reserva</span>}
                  </div>
                )}
              </li>
            );
          })}
          <li className="bg-muted/40 grid gap-1 px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-3 font-semibold">
              <span className="text-sm">Total</span>
              <span className="font-mono text-sm tabular-nums">
                <span className={PRIVADO}>{euros(final, { inteiro: true })}</span>
              </span>
            </div>
            <Movimentos entra={p.comFluxos ? total.entra : 0} gastos={p.comFluxos ? total.gastos : 0} casa={total.casa} />
          </li>
        </ol>

        <div className="-mx-4 overflow-x-auto max-sm:hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-y text-left text-xs">
                <th scope="col" className="py-2 pr-3 pl-4 font-medium">Mês</th>
                {p.comFluxos && <th scope="col" className="px-3 py-2 text-right font-medium">Entra</th>}
                {p.comFluxos && <th scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap">Gastos e renda</th>}
                <th scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap">Despesas da casa</th>
                <th scope="col" className="py-2 pr-4 pl-3 text-right font-medium whitespace-nowrap">Saldo no fim</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <tr className="border-b">
                <th scope="row" className="text-muted-foreground py-1.5 pr-3 pl-4 text-left font-sans font-normal">Hoje</th>
                {p.comFluxos && <td />}
                {p.comFluxos && <td />}
                <td />
                <td className="py-1.5 pr-4 pl-3 text-right whitespace-nowrap">
                  <span className={PRIVADO}>{inteiro(disponivel)}</span>
                </td>
              </tr>
              {linhas.map((l) => {
                const negativo = l.saldo != null && l.saldo < 0;
                const abaixo = !negativo && p.reserva > 0 && l.saldo != null && l.saldo < p.reserva;
                return (
                  <tr key={l.chave} className={cn("border-b align-top", l.destaque && "bg-secondary/60")}>
                    <th scope="row" className="py-1.5 pr-3 pl-4 text-left font-sans font-normal">
                      <span className={cn("whitespace-nowrap", l.destaque && "font-medium")}>{l.rotulo}</span>
                      {l.notas.map((n, i) => (
                        <span key={i} className="text-muted-foreground block text-xs">
                          {n}
                        </span>
                      ))}
                    </th>
                    {p.comFluxos && (
                      <Celula tom="entra" privado>
                        {mais(l.entra)}
                      </Celula>
                    )}
                    {p.comFluxos && <Celula tom="sai">{menos(l.gastos)}</Celula>}
                    <Celula tom="sai">{menos(l.casa)}</Celula>
                    <td
                      className={cn(
                        "py-1.5 pr-4 pl-3 text-right whitespace-nowrap",
                        l.destaque && "font-semibold",
                        negativo && "text-destructive",
                        abaixo && "text-aviso",
                      )}
                    >
                      <span className={PRIVADO}>{euros(l.saldo, { inteiro: true })}</span>
                      {abaixo && <span className="block font-sans text-xs">abaixo da reserva</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="font-mono tabular-nums">
              <tr className="bg-muted/40 font-semibold">
                <th scope="row" className="py-2 pr-3 pl-4 text-left font-sans">Total</th>
                {p.comFluxos && (
                  <Celula tom="entra" privado>
                    {mais(total.entra)}
                  </Celula>
                )}
                {p.comFluxos && <Celula tom="sai">{menos(total.gastos)}</Celula>}
                <Celula tom="sai">{menos(total.casa)}</Celula>
                <td className="py-2 pr-4 pl-3 text-right whitespace-nowrap">
                  <span className={PRIVADO}>{euros(final, { inteiro: true })}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}

      {p.depoisDoFim.n > 0 && (
        <p className="text-muted-foreground text-xs">
          {p.depoisDoFim.n} despesa{p.depoisDoFim.n === 1 ? "" : "s"} para lá de 36 meses (
          {euros(p.depoisDoFim.valor)}) ainda não {p.depoisDoFim.n === 1 ? "entra" : "entram"} nestas contas.
        </p>
      )}
    </section>
  );
}

/** "entra +2 000 € · gastos e renda −1 500 € · despesas da casa −800 €", só o que não é zero. */
function Movimentos({ entra, gastos, casa }: { entra: number; gastos: number; casa: number }) {
  const itens = [
    { rotulo: "entra", valor: entra, texto: mais(entra), tom: "text-ok", privado: true },
    { rotulo: "gastos e renda", valor: gastos, texto: menos(gastos), tom: "text-destructive", privado: false },
    { rotulo: "despesas da casa", valor: casa, texto: menos(casa), tom: "text-destructive", privado: false },
  ].filter((i) => i.valor);
  if (!itens.length) return null;
  return (
    <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {itens.map((i) => (
        <span key={i.rotulo} className="whitespace-nowrap">
          {i.rotulo} <span className={cn("font-mono tabular-nums", i.tom, i.privado && PRIVADO)}>{i.texto}</span>
        </span>
      ))}
    </p>
  );
}

function Celula({ children, tom, privado = false }: { children: React.ReactNode; tom: "entra" | "sai"; privado?: boolean }) {
  const vazio = children === "—";
  return (
    <td
      className={cn(
        "px-3 py-1.5 text-right whitespace-nowrap",
        vazio ? "text-muted-foreground" : tom === "entra" ? "text-ok" : "text-destructive",
      )}
    >
      {privado && !vazio ? <span className={PRIVADO}>{children}</span> : children}
    </td>
  );
}
