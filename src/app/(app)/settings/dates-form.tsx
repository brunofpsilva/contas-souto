"use client";

import { useActionState } from "react";
import { saveDatesAndReserve } from "@/actions/settings";
import type { ActionState } from "@/actions/state";
import { ActionMessage } from "@/components/action-message";
import { Amount } from "@/components/amount";
import { HelpPopover } from "@/components/help-popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { toInputAmount } from "@/lib/format";
import { MILESTONES, type Milestone } from "@/lib/milestones";
import { PRIVATE } from "@/lib/privacy";
import { cn } from "@/lib/utils";

export interface MilestoneData {
  /** YYYY-MM-DD, or null without a date. */
  date: string | null;
  /** Expenses paid at this milestone. */
  expenseCount: number;
  total: number;
}

/** The two dates and the minimum reserve, saved with a single button. */
export function DatesForm({ milestones, reserve }: { milestones: Record<Milestone, MilestoneData>; reserve: number }) {
  const t = useT();
  const [state, action, saving] = useActionState<ActionState, FormData>(saveDatesAndReserve, null);

  return (
    <Card className="p-4">
      <form action={action} className="grid gap-4">
        {MILESTONES.map((kind) => {
          const m = milestones[kind];
          return (
            <div key={kind} className="grid gap-1.5">
              <Label htmlFor={`date-${kind}`}>{t.milestones[kind].title}</Label>
              <Input id={`date-${kind}`} name={kind} type="date" defaultValue={m.date ?? ""} min="2020-01-01" max="2100-12-31" />
              {m.expenseCount > 0 && (
                <p className="text-ink-muted text-sm">
                  {t.expenseCount(m.expenseCount)} · <Amount v={m.total} whole />
                </p>
              )}
            </div>
          );
        })}

        <div className="grid gap-1.5">
          <div className="-my-2 flex items-center justify-between">
            <Label htmlFor="reserve">{t.common.minReserve}</Label>
            <HelpPopover label={t.settings.reserveHelpLabel} className="-mr-3">
              {t.settings.reserveHelp}
            </HelpPopover>
          </div>
          <div className="relative">
            <Input
              id="reserve"
              name="reserve"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={reserve ? toInputAmount(t, reserve) : ""}
              placeholder="0"
              className={cn("pr-8 tabular-nums", PRIVATE)}
            />
            <span className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit" className="max-sm:w-full" disabled={saving}>
            {saving ? t.common.saving : t.common.save}
          </Button>
          <ActionMessage state={state} />
        </div>
      </form>
    </Card>
  );
}
