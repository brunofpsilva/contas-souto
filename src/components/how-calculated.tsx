"use client";

import { ChevronRight } from "lucide-react";
import { Amount } from "@/components/amount";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/config";
import { formatEuros } from "@/lib/format";
import { PRIVATE } from "@/lib/privacy";
import type { AnnualIncome, TrendComponent, TrendRule } from "@/lib/trend";

/** The sentence that explains a rule ("Fixo: Ana 1 500 € + Rui 1 200 €", "Valor habitual…"). */
function ruleText(t: Messages, rule: TrendRule): string {
  if (rule.kind === "fixed") {
    return t.trend.rules.fixed(rule.salaries.map((s) => `${s.name} ${formatEuros(t, s.amount, { whole: s.amount % 1 === 0 })}`).join(" + "));
  }
  return rule.kind === "secondLowest" ? t.trend.rules.secondLowest(rule.months) : t.trend.rules.usual(rule.months);
}

/**
 * Where the forecast's income and monthly spending come from: each part with its monthly amount
 * and the rule that works it out. Stays closed until someone wants to see it.
 */
export function HowCalculated({ components, annual }: { components: TrendComponent[]; annual: AnnualIncome[] }) {
  const t = useT();
  const income = components.filter((c) => c.direction === "in");
  const outgoings = components.filter((c) => c.direction === "out");

  return (
    <details className="group">
      <summary className="focus-visible:ring-ring/50 flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm font-semibold outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
        {t.forecast.howCalculated}
      </summary>
      <Card className="mt-2 divide-y">
        {income.length > 0 && <Group title={t.forecast.incomePerMonth} rows={income} isPrivate />}
        {outgoings.length > 0 && <Group title={t.common.monthlySpending} rows={outgoings} />}
        {annual.length > 0 && (
          <div className="grid gap-2 p-4">
            <h3 className="text-ink-muted text-sm font-medium">{t.forecast.onceAYear}</h3>
            <dl className="grid gap-2">
              {annual.map((a) => (
                <div key={`${a.type}-${a.sourceMonth}`} className="flex items-baseline justify-between gap-3">
                  <dt>
                    {t.trend.annual[a.name]} · {t.months.short[Number(a.sourceMonth.slice(5)) - 1]}
                  </dt>
                  <dd>
                    <Amount v={a.amount} whole private />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Card>
    </details>
  );
}

function Group({ title, rows, isPrivate = false }: { title: string; rows: TrendComponent[]; isPrivate?: boolean }) {
  const t = useT();
  return (
    <div className="grid gap-2 p-4">
      <h3 className="text-ink-muted text-sm font-medium">{title}</h3>
      <dl className="grid gap-2">
        {rows.map((c) => (
          <div key={c.id} className="grid gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt>{t.trend.components[c.id]}</dt>
              <dd>
                <Amount v={c.value.base} whole private={isPrivate} />
              </dd>
            </div>
            {/* The salaries' rule has amounts: it is hidden along with the balances. */}
            <dd className={isPrivate ? `text-ink-muted text-sm ${PRIVATE}` : "text-ink-muted text-sm"}>{ruleText(t, c.rule)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
