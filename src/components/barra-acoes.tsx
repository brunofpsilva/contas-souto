import { cn } from "@/lib/utils";

/**
 * Os botões de um formulário de sub-página. No telemóvel ficam fixos em baixo, no lugar da
 * barra de navegação e ao alcance do polegar; a partir de md ficam no fim do formulário.
 * O formulário tem de deixar espaço em baixo para não ficar tapado (max-md:pb-*).
 */
export function BarraAcoes({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "bg-fundo/95 supports-backdrop-filter:bg-fundo/85 fixed inset-x-0 bottom-0 z-20 grid gap-2 border-t pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur",
        "md:static md:z-auto md:flex md:flex-wrap md:items-center md:gap-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
