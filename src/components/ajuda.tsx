"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** O "(i)": uma explicação que só aparece a quem a pede, em vez de um parágrafo fixo no ecrã. */
export function Ajuda({ rotulo = "Ajuda", className, children }: { rotulo?: string; className?: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={rotulo}
          className={cn(
            "text-texto-suave hover:text-texto focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3",
            className,
          )}
        >
          <Info className="size-5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  );
}
