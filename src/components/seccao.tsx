import { cn } from "@/lib/utils";

/** Secção de um ecrã: título curto (3 palavras no máximo), com uma ação opcional à direita. */
export function Seccao({
  id,
  titulo,
  acao,
  className,
  children,
}: {
  id?: string;
  titulo: string;
  acao?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  // Sem acentos, para o id ficar legível ("Sessão" -> "titulo-sessao").
  const idTitulo = `titulo-${id ?? titulo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section id={id} aria-labelledby={idTitulo} className={cn("grid content-start gap-2", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={idTitulo} className="text-base font-semibold">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
