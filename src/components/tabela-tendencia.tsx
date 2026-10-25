import { FormGastos } from "@/components/form-gastos";
import { euros } from "@/lib/formato";
import { mesCurto, mesPorExtenso } from "@/lib/meses";
import { picosDoCiclo, type GastoCiclo, type Tendencia } from "@/lib/tendencia";

/** Avisos da previsão e, num bloco fechado, como se calcula e os gastos editáveis de cada ciclo. */
export function TabelaTendencia({ t, ciclos = [] }: { t: Tendencia; ciclos?: GastoCiclo[] }) {
  const inteiro = (v: number) => euros(v, { inteiro: true });
  // Possíveis gastos: picos do mesmo ciclo do ano passado, neste ciclo e no seguinte.
  // No ciclo atual, só o que ainda não aconteceu (menos de metade já gasto nessa categoria).
  const possiveis = ciclos
    .slice(0, 2)
    .map((c) => ({
      mes: c.mes,
      picos: picosDoCiclo(t.picos, c.mes).filter((g) => c.mes !== t.mesAtual || (t.cicloAtual.gastoPorCategoria[g.nome] ?? 0) < g.total / 2),
    }))
    .filter((x) => x.picos.length);

  return (
    <section aria-label="Como calculamos o dia a dia" className="grid gap-3">
      {t.avisos.length > 0 && (
        <ul className="bg-aviso-suave text-aviso grid gap-1 rounded-lg px-3 py-2 text-sm">
          {t.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      {t.componentes.length > 0 && (
        <details className="grid gap-3">
          <summary className="text-primary w-fit cursor-pointer py-2 text-sm font-medium">
            Como calculamos e gastos de cada mês
            {possiveis.length > 0 && (
              <span className="bg-aviso-suave text-aviso ml-2 rounded-full px-2 py-0.5 text-xs">
                {possiveis.length === 1 ? "1 aviso" : `${possiveis.length} avisos`}
              </span>
            )}
          </summary>
          <div className="mt-3 grid gap-3">
            {possiveis.length > 0 && (
              <ul className="bg-aviso-suave text-aviso grid gap-1.5 rounded-lg px-3 py-2 text-sm">
                {possiveis.map((x) => (
                  <li key={x.mes}>
                    <span className="font-medium">
                      Possíveis gastos {x.mes === t.mesAtual ? "neste ciclo" : `em ${mesPorExtenso(x.mes).replace(/ de \d{4}$/, "")}`}:
                    </span>{" "}
                    no ciclo de {mesCurto(x.picos[0].mesOrigem)} houve {x.picos.map((g) => `${g.nome} ${inteiro(g.total)}`).join(", ")}.
                    Não estão na previsão; se contares com eles, muda o valor do mês abaixo.
                  </li>
                ))}
              </ul>
            )}
            {ciclos.length > 0 && <FormGastos ciclos={ciclos} />}
          </div>
        </details>
      )}
    </section>
  );
}
