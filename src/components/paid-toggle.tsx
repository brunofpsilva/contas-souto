"use client";

import { Check } from "lucide-react";
import { startTransition, useOptimistic, useTransition } from "react";
import { setStatus } from "@/actions/expenses";
import { useToast } from "@/components/toasts";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The circle of each expense: one tap marks it as paid (or back to pay). It changes on screen
 * straight away and shows a toast with "Undo", because the row may leave the list being viewed.
 */
export function PaidToggle({ id, description, paid }: { id: number; description: string; paid: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [checked, setChecked] = useOptimistic(paid);
  const toast = useToast();

  function toggle() {
    const next = !checked;
    start(async () => {
      setChecked(next);
      const r = await setStatus(id, next ? "paid" : "planned");
      if (!r.ok) return toast({ text: r.message });
      toast({
        text: next ? t.expenses.markedPaid(description) : t.expenses.markedUnpaid(description),
        // Undo doesn't depend on this row, which may no longer be on screen.
        action: { text: t.expenses.undo, onClick: () => startTransition(async () => void (await setStatus(id, next ? "planned" : "paid"))) },
      });
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={t.expenses.toggleLabel(description, checked)}
      disabled={pending}
      onClick={toggle}
      className="group flex w-11 shrink-0 items-center justify-center self-stretch outline-none"
    >
      <span
        className={cn(
          "group-focus-visible:ring-ring/50 flex size-6 items-center justify-center rounded-full border-2 transition-colors group-focus-visible:ring-3",
          checked ? "border-brand bg-brand text-on-brand" : "border-line-strong",
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}
