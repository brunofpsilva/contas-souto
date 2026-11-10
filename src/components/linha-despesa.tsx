import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { BotaoPago } from "@/components/botao-pago";
import { Badge } from "@/components/ui/badge";
import { Valor } from "@/components/valor";
import type { DespesaVista } from "@/lib/dados";
import { dataCurta, dataDoMarco, MARCOS, type DatasMarcos } from "@/lib/escritura";
import { maiuscula } from "@/lib/formato";
import { mesLongo } from "@/lib/meses";
import { marcoDe } from "@/lib/previsao";
import { rotuloCategoria } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

/**
 * Uma despesa numa lista. Dois alvos: o círculo marca como paga; o resto da linha abre a
 * despesa para editar ou apagar. `resumida` é a versão do Início (sem cêntimos nem categoria).
 */
export function LinhaDespesa({
  d,
  datas,
  resumida = false,
}: {
  d: DespesaVista & { atrasada: boolean };
  datas: DatasMarcos;
  resumida?: boolean;
}) {
  const pago = d.estado === "pago";
  const marco = marcoDe(d);
  const dataMarco = marco ? dataDoMarco(marco, datas) : null;
  // Na lista completa o mês já está no título do grupo; no Início diz-se em cada linha.
  const detalhes = resumida ? (d.atrasada || marco ? [] : [maiuscula(mesLongo(d.mes))]) : [rotuloCategoria(d.categoria), d.divisao].filter(Boolean);

  return (
    <li className="flex items-stretch pl-1">
      <BotaoPago id={d.id} descricao={d.descricao} pago={pago} />
      <Link
        href={`/despesas/${d.id}/editar`}
        className="focus-visible:ring-ring/50 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-4 pl-1 outline-none focus-visible:ring-3"
      >
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className={cn("font-medium wrap-break-word", pago && "text-texto-suave")}>{d.descricao}</span>
          <span className="text-texto-suave flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            {d.atrasada && (
              <Badge variant="aviso">
                <TriangleAlert aria-hidden />
                Atrasada · {mesLongo(d.mes)}
              </Badge>
            )}
            {marco && (
              <Badge>
                {MARCOS[marco].titulo}
                {dataMarco ? ` · ${dataCurta(dataMarco)}` : ""}
              </Badge>
            )}
            {pago && !resumida && <Badge variant="contorno">Paga</Badge>}
            {detalhes.length > 0 && <span className="wrap-break-word">{detalhes.join(" · ")}</span>}
          </span>
        </span>
        <Valor v={d.valor} inteiro={resumida} className={cn("font-medium", pago && "text-texto-suave")} />
      </Link>
    </li>
  );
}
