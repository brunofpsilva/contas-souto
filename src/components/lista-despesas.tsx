import { AcoesDespesa } from "@/components/acoes-despesa";
import { agruparPorMes } from "@/lib/agrupar";
import type { DespesaVista } from "@/lib/dados";
import { euros } from "@/lib/formato";
import { mesPorExtenso } from "@/lib/meses";
import { cn } from "@/lib/utils";

const DATA = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "short" });

export function ListaDespesas({
  despesas,
  mesAtual,
  vazio = "Ainda não há despesas.",
}: {
  despesas: DespesaVista[];
  mesAtual: string;
  vazio?: string;
}) {
  const grupos = agruparPorMes(despesas, mesAtual);
  if (!grupos.length) {
    return <p className="text-muted-foreground bg-card rounded-xl border p-6 text-center text-sm">{vazio}</p>;
  }

  return (
    <div className="grid gap-6">
      {grupos.map((g) => (
        <section key={g.mes} aria-labelledby={`mes-${g.mes}`} className="grid gap-2">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 px-1">
            <h3 id={`mes-${g.mes}`} className="font-heading font-bold first-letter:uppercase">
              {mesPorExtenso(g.mes)}
              {g.mes === mesAtual && <span className="text-muted-foreground ml-2 text-xs font-normal">mês atual</span>}
            </h3>
            <p className="text-muted-foreground text-xs">
              {g.porPagar > 0 && (
                <>
                  por pagar <span className="text-foreground font-mono tabular-nums">{euros(g.porPagar)}</span>
                </>
              )}
              {g.porPagar > 0 && g.pago > 0 && " · "}
              {g.pago > 0 && (
                <>
                  pago <span className="font-mono tabular-nums">{euros(g.pago)}</span>
                </>
              )}
            </p>
          </header>
          <ul className="bg-card divide-y rounded-xl border">
            {g.despesas.map((d) => {
              const pago = d.estado === "pago";
              return (
                <li key={d.id} className="grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_auto]">
                  <div className="grid min-w-0 gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("font-medium break-words", pago && "text-muted-foreground")}>{d.descricao}</span>
                      {d.atrasada && <Etiqueta tom="mau">Atrasada · {mesPorExtenso(d.mes)}</Etiqueta>}
                      {pago && <Etiqueta tom="ok">Pago</Etiqueta>}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {d.categoria} · {d.quem === "Ambos" ? "Pagam ambos" : `Paga ${d.quem}`}
                      {d.nota && <> · {d.nota}</>}
                    </p>
                    <p className="text-muted-foreground/80 text-xs">
                      {d.criadoPor && <>Criada por {d.criadoPor}</>}
                      {pago && d.pagoPor && d.pagoEm && (
                        <>
                          {d.criadoPor && " · "}Marcada como paga por {d.pagoPor} a {DATA.format(d.pagoEm)}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                    <span className={cn("font-mono font-medium tabular-nums whitespace-nowrap", pago && "text-muted-foreground line-through decoration-1")}>
                      {euros(d.valor)}
                    </span>
                    <AcoesDespesa id={d.id} descricao={d.descricao} estado={d.estado} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Etiqueta({ tom, children }: { tom: "ok" | "mau"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tom === "ok" ? "bg-ok-suave text-ok" : "bg-mau-suave text-destructive",
      )}
    >
      {children}
    </span>
  );
}
