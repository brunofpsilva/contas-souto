"use client";

import { ChevronDown, CircleX, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/amount";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n/client";
import type { ForecastRow } from "@/lib/forecast-view";
import { cn } from "@/lib/utils";

// One component for both sizes. On phones it is a list: each row shows the month and the balance,
// and opens its parts with a tap. From md up the same parts are always visible, in columns, like
// a table.
const GRID = "md:grid md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] md:items-baseline md:gap-x-4 md:px-4";

export function MonthByMonth({ balanceToday, rows }: { balanceToday: number; rows: ForecastRow[] }) {
  const t = useT();
  return (
    <Card className="overflow-hidden">
      <div className={cn(GRID, "text-ink-muted border-b py-2.5 text-xs font-medium max-md:hidden")} aria-hidden>
        <span>{t.forecast.month}</span>
        <span className="text-right">{t.common.income}</span>
        <span className="text-right">{t.common.monthlySpending}</span>
        <span className="text-right">{t.common.expenses}</span>
        <span className="text-right">{t.common.projectedBalance}</span>
      </div>
      <ol className="divide-y">
        <li className="flex min-h-12 items-center justify-between gap-3 px-4 md:py-2.5">
          <span className="text-ink-muted">{t.common.balanceToday}</span>
          {/* The space on the right lines up with the balance of the rows that have an arrow. */}
          <Amount v={balanceToday} whole private className="font-medium max-md:mr-7" />
        </li>
        {rows.map((r) => (
          <Row key={r.key} r={r} />
        ))}
      </ol>
    </Card>
  );
}

function Row({ r }: { r: ForecastRow }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const hasParts = r.income > 0 || r.spending > 0 || r.expenses > 0 || r.notes.length > 0;
  const partsId = `parts-${r.key}`;

  const title = (
    <span className="grid min-w-0 justify-items-start gap-1">
      <span className={cn(r.milestone && "font-medium")}>
        {r.title}
        {r.until && <span className="text-ink-muted"> · {r.until}</span>}
      </span>
      {r.alert === "short" && (
        <Badge variant="negative">
          <CircleX aria-hidden />
          {t.forecast.short}
        </Badge>
      )}
      {r.alert === "reserve" && (
        <Badge variant="warning">
          <TriangleAlert aria-hidden />
          {t.forecast.belowReserve}
        </Badge>
      )}
    </span>
  );
  const balance = <Amount v={r.balance} whole private className={cn("font-medium", r.alert === "short" && "text-negative")} />;

  return (
    <li className={cn(GRID, "md:py-2.5", r.milestone && "bg-surface-muted/60")}>
      {/* Phone: the row is a button that opens and closes the parts. */}
      <button
        type="button"
        aria-expanded={hasParts ? open : undefined}
        aria-controls={hasParts ? partsId : undefined}
        disabled={!hasParts}
        onClick={() => setOpen(!open)}
        className="focus-visible:ring-ring/50 flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset md:hidden"
      >
        <span className="min-w-0 flex-1">{title}</span>
        {balance}
        <ChevronDown className={cn("text-ink-muted size-4 shrink-0 transition-transform", open && "rotate-180", !hasParts && "invisible")} aria-hidden />
      </button>

      <div className="max-md:hidden">{title}</div>
      <dl id={partsId} className={cn("grid gap-1.5 px-4 pb-3 text-sm md:contents md:text-base", !open && "max-md:hidden")}>
        <Part label={t.common.income} v={r.income} isPrivate />
        <Part label={t.common.monthlySpending} v={-r.spending} />
        <Part label={t.common.expenses} v={-r.expenses} />
      </dl>
      <div className="text-right max-md:hidden">{balance}</div>

      {r.notes.length > 0 && (
        <ul className={cn("text-ink-muted grid gap-0.5 px-4 pb-3 text-sm md:col-span-5 md:px-0 md:pt-1 md:pb-0", !open && "max-md:hidden")}>
          {r.notes.map((n) => (
            <li key={n.text}>
              {n.text}
              {n.amount != null && (
                <>
                  {" "}
                  <Amount v={n.amount} whole private={n.private} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** One part of the month. On phones it only shows if it isn't zero; in columns, a zero is a dash. */
function Part({ label, v, isPrivate = false }: { label: string; v: number; isPrivate?: boolean }) {
  if (!v) return <div className="text-ink-muted text-right max-md:hidden">—</div>;
  return (
    <div className="flex items-baseline justify-between gap-3 md:block md:text-right">
      <dt className="text-ink-muted md:sr-only">{label}</dt>
      <dd>
        <Amount v={v} whole sign private={isPrivate} />
      </dd>
    </div>
  );
}
