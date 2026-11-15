"use client";

import { Amount } from "@/components/amount";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Thin bar with what is paid and what is still to pay: two shades of the same colour, told apart
 * by lightness. With `limit`, the bar's background is what is still left; if the total goes over
 * the limit, a mark shows where it is.
 */
export function BudgetBar({
  paid,
  unpaid,
  limit = null,
  scale,
  className,
}: {
  paid: number;
  unpaid: number;
  limit?: number | null;
  /** Amount that fills the bar, to compare several of them. By default, the limit or the total. */
  scale?: number;
  className?: string;
}) {
  const total = paid + unpaid;
  const full = Math.max(scale ?? 0, limit ?? 0, total) || 1;
  const pct = (v: number) => `${(v / full) * 100}%`;
  const over = limit != null && total > limit;
  return (
    <div className={cn("relative flex h-2 gap-0.5 overflow-hidden rounded-full", limit != null && "bg-surface-muted", className)} aria-hidden>
      {over && <span className="bg-ink absolute inset-y-0 z-10 w-0.5" style={{ left: pct(limit) }} />}
      {paid > 0 && <span className="bg-chart-paid last:rounded-r-full" style={{ width: pct(paid) }} />}
      {unpaid > 0 && <span className="bg-chart-unpaid last:rounded-r-full" style={{ width: pct(unpaid) }} />}
    </div>
  );
}

/** Legend of the bar. With amounts, shows them next to each name. */
export function BarLegend({ paid, unpaid, className }: { paid?: number; unpaid?: number; className?: string }) {
  const t = useT();
  return (
    <p className={cn("text-ink-muted flex flex-wrap gap-x-4 gap-y-1 text-xs", className)}>
      <Item color="bg-chart-paid">
        {t.common.paid}
        {paid != null && <Amount v={paid} whole className="text-ink" />}
      </Item>
      <Item color="bg-chart-unpaid">
        {t.common.toPay}
        {unpaid != null && <Amount v={unpaid} whole className="text-ink" />}
      </Item>
    </p>
  );
}

function Item({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 shrink-0 rounded-sm", color)} aria-hidden />
      {children}
    </span>
  );
}
