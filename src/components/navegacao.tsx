"use client";

import { House, Landmark, PiggyBank, ReceiptText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LIGACOES = [
  { href: "/", texto: "Resumo", Icone: House },
  { href: "/despesas", texto: "Despesas", Icone: ReceiptText },
  { href: "/orcamento", texto: "Orçamento", Icone: PiggyBank },
  { href: "/contas", texto: "Contas", Icone: Landmark },
] as const;

function useAtiva() {
  const caminho = usePathname();
  return (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));
}

/** Separadores no cabeçalho (tablet e ecrãs largos). */
export function Navegacao({ className }: { className?: string }) {
  const ativa = useAtiva();
  return (
    <nav aria-label="Principal" className={cn("flex gap-1", className)}>
      {LIGACOES.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={ativa(l.href) ? "page" : undefined}
          className={cn(
            "flex h-10 items-center rounded-lg px-3.5 text-sm font-medium transition-colors",
            ativa(l.href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.texto}
        </Link>
      ))}
    </nav>
  );
}

/** Barra fixa em baixo no telemóvel, ao alcance do polegar. */
export function NavegacaoFundo({ className }: { className?: string }) {
  const ativa = useAtiva();
  return (
    <nav
      aria-label="Principal"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur",
        "pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
        className,
      )}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {LIGACOES.map(({ href, texto, Icone }) => {
          const sim = ativa(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={sim ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  sim ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    sim && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icone className="size-5" strokeWidth={sim ? 2.25 : 1.75} aria-hidden />
                </span>
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
