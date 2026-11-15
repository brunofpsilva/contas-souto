"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** The "(i)": an explanation that only shows up for whoever asks, instead of a fixed paragraph on screen. */
export function HelpPopover({ label, className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label ?? t.common.help}
          className={cn(
            "text-ink-muted hover:text-ink focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3",
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
