"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { PaidToggle } from "@/components/paid-toggle";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";
import type { ExpenseView } from "@/lib/data";
import { milestoneOf } from "@/lib/forecast";
import { capitalize, longMonth, shortDate } from "@/lib/format";
import { milestoneDate, type MilestoneDates } from "@/lib/milestones";
import { cn } from "@/lib/utils";

/**
 * An expense in a list. Two targets: the circle marks it as paid; the rest of the row opens the
 * expense to edit or delete it. `compact` is the Home version (no cents or category).
 */
export function ExpenseRow({
  e,
  dates,
  compact = false,
}: {
  e: ExpenseView & { overdue: boolean };
  dates: MilestoneDates;
  compact?: boolean;
}) {
  const t = useT();
  const paid = e.status === "paid";
  const milestone = milestoneOf(e);
  const date = milestone ? milestoneDate(milestone, dates) : null;
  // In the full list the month is already in the group title; on Home each row says it.
  const details = compact
    ? e.overdue || milestone
      ? []
      : [capitalize(longMonth(t, e.month))]
    : [t.categories[e.category], e.room].filter(Boolean);

  return (
    <li className="flex items-stretch pl-1">
      <PaidToggle id={e.id} description={e.description} paid={paid} />
      <Link
        href={`/expenses/${e.id}/edit`}
        className="focus-visible:ring-ring/50 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-4 pl-1 outline-none focus-visible:ring-3"
      >
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className={cn("font-medium wrap-break-word", paid && "text-ink-muted")}>{e.description}</span>
          <span className="text-ink-muted flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            {e.overdue && (
              <Badge variant="warning">
                <TriangleAlert aria-hidden />
                {t.expenses.overdue(longMonth(t, e.month))}
              </Badge>
            )}
            {milestone && (
              <Badge>
                {t.milestones[milestone].title}
                {date ? ` · ${shortDate(t, date)}` : ""}
              </Badge>
            )}
            {paid && !compact && <Badge variant="outline">{t.expenses.paidBadge}</Badge>}
            {details.length > 0 && <span className="wrap-break-word">{details.join(" · ")}</span>}
          </span>
        </span>
        <Amount v={e.amount} whole={compact} className={cn("font-medium", paid && "text-ink-muted")} />
      </Link>
    </li>
  );
}
