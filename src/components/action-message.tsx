import type { ActionState } from "@/actions/state";
import { cn } from "@/lib/utils";

/** Result of an action ("Saved." or the error), read by screen readers without interrupting. */
export function ActionMessage({ state, className }: { state: { ok: boolean; message: string } | ActionState; className?: string }) {
  return (
    <p aria-live="polite" className={cn("text-sm empty:hidden", state?.ok ? "text-positive" : "text-negative", className)}>
      {state?.message}
    </p>
  );
}
