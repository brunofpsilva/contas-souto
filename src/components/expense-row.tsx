"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";
import type { ExpenseView } from "@/lib/data";
import { milestoneOf } from "@/lib/forecast";
import { longMonth, shortDate } from "@/lib/format";
import { milestoneDate, type MilestoneDates } from "@/lib/milestones";
import { cn } from "@/lib/utils";

/**
 * An expense in a list. The whole row opens the expense; marking it as paid is done there, on
 * purpose, so it can't happen by accident while scrolling.
 */
export function ExpenseRow({ e, dates }: { e: ExpenseView & { overdue: boolean }; dates: MilestoneDates }) {
  const t = useT();
  const paid = e.status === "paid";
  const milestone = milestoneOf(e);
  const date = milestone ? milestoneDate(milestone, dates) : null;
  // The month is already in the group title.
  const details = [t.categories[e.category], e.room].filter(Boolean);

  return (
    <li>
      <Link
        href={`/expenses/${e.id}/edit`}
        className="focus-visible:ring-ring/50 flex min-h-14 min-w-0 items-center gap-3 rounded-lg px-4 py-2 outline-none focus-visible:ring-3"
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
            {paid && <Badge variant="outline">{t.expenses.paidBadge}</Badge>}
            {details.length > 0 && <span className="wrap-break-word">{details.join(" · ")}</span>}
          </span>
        </span>
        <Amount v={e.amount} className={cn("font-medium", paid && "text-ink-muted")} />
      </Link>
    </li>
  );
}
