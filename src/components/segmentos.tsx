import Link from "next/link";
import { cn } from "@/lib/utils";

// Controlo segmentado: duas ou três opções lado a lado, escolhe-se com um toque.
// O alvo de toque tem 44 px de altura; a pílula que se vê lá dentro tem 36.
const PISTA = "bg-superficie-suave grid auto-cols-fr grid-flow-col gap-1 rounded-lg px-1";
const ALVO = "group/segmento flex h-11 min-w-0 cursor-pointer items-center py-1 outline-none";
const PILULA =
  "text-texto-suave flex h-full w-full items-center justify-center rounded-sm px-2 text-center text-sm leading-tight font-medium transition-colors";
const ESCOLHIDA = "bg-superficie text-texto shadow-segmento";

/** Segmentos que são ligações (filtros que mudam o endereço). */
export function SegmentosLigacoes({
  rotulo,
  opcoes,
  className,
}: {
  /** Nome do grupo para leitores de ecrã, por exemplo "Filtrar despesas". */
  rotulo: string;
  opcoes: { href: string; texto: string; ativa: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={rotulo} className={cn(PISTA, className)}>
      {opcoes.map((o) => (
        <Link key={o.href} href={o.href} aria-current={o.ativa ? "page" : undefined} className={ALVO}>
          <span className={cn(PILULA, o.ativa && ESCOLHIDA, "group-focus-visible/segmento:ring-ring/50 group-focus-visible/segmento:ring-3")}>
            {o.texto}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Segmentos que são uma escolha de formulário (rádios). Com `aoMudar` é controlado por quem
 * o usa (que tem de ser um componente de cliente); sem ele, parte de `valor` e segue sozinho.
 */
export function SegmentosEscolha({
  nome,
  rotulo,
  esconderRotulo = false,
  opcoes,
  valor,
  aoMudar,
  className,
}: {
  nome: string;
  rotulo: string;
  esconderRotulo?: boolean;
  opcoes: { valor: string; texto: string }[];
  valor: string;
  aoMudar?: (valor: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-1.5", className)}>
      <legend className={esconderRotulo ? "sr-only" : "mb-1.5 text-sm leading-none font-medium select-none"}>{rotulo}</legend>
      <div className={PISTA}>
        {opcoes.map((o) => (
          <label key={o.valor} className={ALVO}>
            <input
              type="radio"
              name={nome}
              value={o.valor}
              className="peer sr-only"
              {...(aoMudar ? { checked: valor === o.valor, onChange: () => aoMudar(o.valor) } : { defaultChecked: valor === o.valor })}
            />
            <span
              className={cn(
                PILULA,
                "peer-checked:bg-superficie peer-checked:text-texto peer-checked:shadow-segmento peer-focus-visible:ring-ring/50 peer-focus-visible:ring-3",
              )}
            >
              {o.texto}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
