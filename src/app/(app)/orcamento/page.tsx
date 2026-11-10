import { ChevronRight, Plus, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Barra, Legenda } from "@/components/barra";
import { Seccao } from "@/components/seccao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Valor } from "@/components/valor";
import { totaisPorCategoria } from "@/lib/agrupar";
import { listarDespesas, listarDivisoes } from "@/lib/dados";
import { plural } from "@/lib/formato";
import { calcularOrcamento, type LinhaOrcamento } from "@/lib/orcamento";
import { rotuloCategoria } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Orçamento" };

const LINHA =
  "focus-visible:ring-ring/50 hover:bg-superficie-suave/50 grid gap-1.5 px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-inset";

export default async function OrcamentoPage() {
  const [divisoes, despesas] = await Promise.all([listarDivisoes(), listarDespesas()]);
  const o = calcularOrcamento(divisoes, despesas);
  const g = o.geral;
  const temLimite = divisoes.some((d) => d.orcamento != null);
  const categorias = totaisPorCategoria(despesas);
  const maiorCategoria = Math.max(1, ...categorias.map((c) => c.total));

  return (
    // No telemóvel, uma coluna pela ordem do código: total, divisões e categorias.
    // A partir de md, as divisões ficam à direita, ao lado do total e das categorias.
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      {divisoes.length > 0 && (
        <Card className="grid gap-3 p-4">
          <div className="grid gap-1">
            <h2 className="text-texto-suave text-sm">Gasto</h2>
            <p className="text-2xl font-semibold">
              <Valor v={g.total} inteiro />
              {temLimite && (
                <span className="text-texto-suave text-base font-normal">
                  {" "}
                  de <Valor v={g.orcamento} inteiro />
                </span>
              )}
            </p>
          </div>
          <Barra pago={g.pago} porPagar={g.porPagar} limite={temLimite ? g.orcamento : null} />
          <Legenda pago={g.pago} porPagar={g.porPagar} />
          {temLimite && <Situacao restante={g.restante} />}
          {g.nExcedidas > 0 && (
            <p className="text-aviso flex items-center gap-1.5 text-sm font-medium">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              {plural(g.nExcedidas, "divisão", "divisões")} acima do limite
            </p>
          )}
        </Card>
      )}

      <Seccao
        titulo="Divisões"
        className="md:col-start-2 md:row-span-2 md:row-start-1"
        acao={
          divisoes.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/orcamento/editar">Editar</Link>
            </Button>
          )
        }
      >
        {divisoes.length === 0 ? (
          <Card className="grid justify-items-start gap-3 p-4">
            <p>Ainda não há divisões.</p>
            <Button asChild className="max-sm:w-full">
              <Link href="/orcamento/editar">
                <Plus aria-hidden />
                Adicionar divisão
              </Link>
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {o.divisoes.map((l) => (
                <li key={l.id}>
                  {/* A linha abre as despesas da divisão. */}
                  <Link href={`/despesas?ver=todas&divisao=${l.id}`} className={LINHA}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium wrap-break-word">{l.nome}</span>
                      <ChevronRight className="text-texto-suave size-4 shrink-0" aria-hidden />
                    </span>
                    <span className="text-texto-suave text-sm">
                      <Valor v={l.total} inteiro className="text-texto" />{" "}
                      {l.orcamento != null ? (
                        <>
                          de <Valor v={l.orcamento} inteiro />
                        </>
                      ) : (
                        "· sem limite"
                      )}
                    </span>
                    {l.orcamento != null && <Barra pago={l.pago} porPagar={l.porPagar} limite={l.orcamento} />}
                    <Situacao restante={l.restante} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {o.naoAplicavel.nDespesas > 0 && <SemDivisao l={o.naoAplicavel} />}
      </Seccao>

      {categorias.length > 0 && (
        <Seccao titulo="Categorias" className="md:col-start-1">
          <Card className="grid gap-4 p-4">
            <ul className="grid gap-4">
              {categorias.map((c) => (
                <li key={c.categoria} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{rotuloCategoria(c.categoria)}</span>
                    <Valor v={c.total} inteiro className="font-medium" />
                  </div>
                  <Barra pago={c.pago} porPagar={c.porPagar} escala={maiorCategoria} />
                </li>
              ))}
            </ul>
            <Legenda />
          </Card>
        </Seccao>
      )}
    </div>
  );
}

/** "Disponível 600 €" ou, quando passa, "Acima do limite 300 €" (aviso, não erro: o orçamento é só comparação). */
function Situacao({ restante }: { restante: number | null }) {
  if (restante == null) return null;
  if (restante < 0) {
    return (
      <span className="text-aviso flex items-center gap-1.5 text-sm font-medium">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span>
          Acima do limite <Valor v={-restante} inteiro />
        </span>
      </span>
    );
  }
  return (
    <span className="text-texto-suave text-sm">
      Disponível <Valor v={restante} inteiro className="text-texto" />
    </span>
  );
}

/** As despesas sem divisão ficam fora do orçamento: aparecem à parte, só quando existem. */
function SemDivisao({ l }: { l: LinhaOrcamento }) {
  return (
    <Card className="overflow-hidden">
      <Link href="/despesas?ver=todas&divisao=nenhuma" className={LINHA}>
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">{l.nome}</span>
          <ChevronRight className="text-texto-suave size-4 shrink-0" aria-hidden />
        </span>
        <span className="text-texto-suave text-sm">
          <Valor v={l.total} inteiro className="text-texto" /> · fora do orçamento
        </span>
      </Link>
    </Card>
  );
}
