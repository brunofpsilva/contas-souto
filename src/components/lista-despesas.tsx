import { AcoesDespesa } from "@/components/acoes-despesa";
import { agruparPorMes } from "@/lib/agrupar";
import type { DespesaVista } from "@/lib/dados";
import { dataCurta, dataDoMarco, MARCOS, type DatasMarcos } from "@/lib/escritura";
import { marcoDe } from "@/lib/previsao";
import { euros } from "@/lib/formato";
import { mesPorExtenso } from "@/lib/meses";
import { cn } from "@/lib/utils";

const DATA = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "short" });

export function ListaDespesas({
  despesas,
  mesAtual,
  datas = { dataEscritura: null, dataConclusaoObra: null },
  vazio = "Ainda não há despesas.",
}: {
  despesas: DespesaVista[];
  mesAtual: string;
  datas?: DatasMarcos;
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
              const marco = marcoDe(d);
              const dataMarco = marco ? dataDoMarco(marco, datas) : null;
              return (
                // Telemóvel: descrição e valor lado a lado, botões numa linha própria por baixo.
                // A partir de sm: valor e botões numa coluna à direita.
                <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 px-4 py-3">
                  <div className="grid min-w-0 gap-1 sm:row-span-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("font-medium wrap-break-word", pago && "text-muted-foreground")}>{d.descricao}</span>
                      {d.atrasada && <Etiqueta tom="mau">Atrasada · {mesPorExtenso(d.mes)}</Etiqueta>}
                      {marco && (
                        <Etiqueta tom="info">
                          Na {MARCOS[marco].nome}
                          {dataMarco ? ` · ${dataCurta(dataMarco)}` : ""}
                        </Etiqueta>
                      )}
                      {pago && <Etiqueta tom="ok">Pago</Etiqueta>}
                    </div>
                    <p className="text-muted-foreground text-xs wrap-break-word">
                      {d.categoria}
                      {d.divisao && <> · {d.divisao}</>}
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
                  <span
                    className={cn(
                      "text-right font-mono font-medium tabular-nums whitespace-nowrap",
                      pago && "text-muted-foreground line-through decoration-1",
                    )}
                  >
                    {euros(d.valor)}
                  </span>
                  <AcoesDespesa
                    id={d.id}
                    descricao={d.descricao}
                    estado={d.estado}
                    className="col-span-2 sm:col-span-1 sm:col-start-2 sm:self-end"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Etiqueta({ tom, children }: { tom: "ok" | "mau" | "info"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tom === "ok" ? "bg-ok-suave text-ok" : tom === "mau" ? "bg-mau-suave text-destructive" : "bg-secondary text-foreground",
      )}
    >
      {children}
    </span>
  );
}
