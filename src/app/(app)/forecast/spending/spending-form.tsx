"use client";

import { useActionState } from "react";
import { saveSpending } from "@/actions/settings";
import type { ActionState } from "@/actions/state";
import { ActionBar } from "@/components/action-bar";
import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { formatEuros, toInputAmount } from "@/lib/format";

export interface SpendingMonth {
  /** YYYY-MM */
  month: string;
  /** "Dezembro", or "Novembro · resto do mês" in the current month. */
  title: string;
  /** The amount the app works out. */
  automatic: number;
  /** The hand-written amount, if any. */
  override: number | null;
  /** "No ano passado: Viagens 800 €" */
  hint?: string;
}

/** The monthly spending of each forecast month: empty uses the automatic amount, or another one is written. */
export function SpendingForm({ months }: { months: SpendingMonth[] }) {
  const t = useT();
  const [state, action, saving] = useActionState<ActionState, FormData>(saveSpending, null);

  return (
    // The key changes when the saved amounts change, so the fields show what was kept.
    <form key={months.map((m) => m.override ?? "").join("|")} action={action} className="grid max-w-xl gap-4 max-md:pb-20">
      {months.map((m) => {
        const help = [m.override != null && t.spending.automatic(formatEuros(t, m.automatic, { whole: true })), m.hint].filter(Boolean).join(" · ");
        return (
          <div key={m.month} className="grid gap-1.5">
            <Label htmlFor={`spending-${m.month}`}>{m.title}</Label>
            <div className="relative">
              <Input
                id={`spending-${m.month}`}
                name={`spending:${m.month}`}
                inputMode="decimal"
                autoComplete="off"
                defaultValue={m.override != null ? toInputAmount(t, m.override) : ""}
                placeholder={String(Math.round(m.automatic))}
                aria-describedby={help ? `help-${m.month}` : undefined}
                className="pr-8 tabular-nums"
              />
              <span className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
            </div>
            {help && (
              <p id={`help-${m.month}`} className="text-ink-muted text-sm">
                {help}
              </p>
            )}
          </div>
        );
      })}

      <ActionBar>
        <ActionMessage state={state} className="md:order-last" />
        <Button type="submit" disabled={saving}>
          {saving ? t.common.saving : t.common.save}
        </Button>
        <Button type="submit" variant="outline" name="reset" value="all" disabled={saving || !months.some((m) => m.override != null)}>
          {t.spending.reset}
        </Button>
      </ActionBar>
    </form>
  );
}
