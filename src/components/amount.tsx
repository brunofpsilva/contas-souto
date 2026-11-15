"use client";

import { useT } from "@/i18n/client";
import { formatEuros } from "@/lib/format";
import { PRIVATE } from "@/lib/privacy";
import { cn } from "@/lib/utils";

/**
 * A euro amount: aligned digits, never broken in the middle. `private` blurs it when the
 * balances are hidden (the eye button).
 */
export function Amount({
  v,
  whole = false,
  sign = false,
  private: isPrivate = false,
  className,
}: {
  v: number | null | undefined;
  /** Rounds to the euro (totals, forecast, budget). */
  whole?: boolean;
  /** Shows "+" on positive values (forecast parts). */
  sign?: boolean;
  private?: boolean;
  className?: string;
}) {
  const t = useT();
  return <span className={cn("tabular-nums whitespace-nowrap", isPrivate && PRIVATE, className)}>{formatEuros(t, v, { whole, sign })}</span>;
}
