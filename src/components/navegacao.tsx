"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LIGACOES = [
  { href: "/", texto: "Resumo" },
  { href: "/despesas", texto: "Despesas" },
  { href: "/contas", texto: "Contas" },
] as const;

export function Navegacao() {
  const caminho = usePathname();
  return (
    <nav aria-label="Principal" className="flex gap-1 max-sm:order-last max-sm:w-full">
      {LIGACOES.map((l) => {
        const ativa = l.href === "/" ? caminho === "/" : caminho.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              ativa ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.texto}
          </Link>
        );
      })}
    </nav>
  );
}
