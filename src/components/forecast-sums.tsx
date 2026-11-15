"use client";

import { Amount } from "@/components/amount";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n/client";
import type { ForecastSums as Sums } from "@/lib/forecast-view";
import { cn } from "@/lib/utils";

/**
 * The sums from today to the last milestone: balance today, plus income, minus monthly spending,
 * minus expenses, equals the projected balance. Shows where the Home number comes from.
 */
export function ForecastSums({ sums, className }: { sums: Sums; className?: string }) {
  const t = useT();
  return (
    <Card className={cn("p-4", className)}>
      <dl className="grid gap-2">
        <Row label={t.common.balanceToday}>
          <Amount v={sums.balanceToday} whole private />
        </Row>
        <Row label={t.common.income}>
          <Amount v={sums.income} whole sign private />
        </Row>
        <Row label={t.common.monthlySpending}>
          <Amount v={-sums.spending} whole />
        </Row>
        <Row label={t.common.expenses}>
          <Amount v={-sums.expenses} whole />
        </Row>
        <div className="flex items-baseline justify-between gap-3 border-t pt-3 font-semibold">
          <dt>{sums.label}</dt>
          <dd>
            <Amount v={sums.balance} whole private className={cn(sums.balance < 0 && "text-negative")} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
