import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { BalanceChart, type BalancePoint } from "@/components/balance-chart";
import { ForecastSums } from "@/components/forecast-sums";
import { HowCalculated } from "@/components/how-calculated";
import { MonthByMonth } from "@/components/month-by-month";
import { RefreshButton } from "@/components/refresh-button";
import { Section } from "@/components/section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Messages } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { getAccounts, getMilestoneDates, getTrend, listExpenses } from "@/lib/data";
import { computeForecast } from "@/lib/forecast";
import { forecastRows, forecastSums, possibleSpending } from "@/lib/forecast-view";
import { capitalize, formatEuros, longMonth } from "@/lib/format";
import type { TrendWarning } from "@/lib/trend";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.forecast };
}

function warningText(t: Messages, w: TrendWarning): string {
  switch (w.code) {
    case "noTransactions":
      return t.trend.warnings.noTransactions;
    case "fewMonths":
      return t.trend.warnings.fewMonths(w.months, w.window);
    case "uncategorised":
      return t.trend.warnings.uncategorised(w.percent);
    case "noSalaries":
      return t.trend.warnings.noSalaries;
  }
}

export default async function ForecastPage() {
  const [t, expenses, accounts, dates, trend] = await Promise.all([getT(), listExpenses(), getAccounts(), getMilestoneDates(), getTrend()]);
  const f = computeForecast({
    expenses,
    available: accounts.available,
    reserve: accounts.reserve,
    ...dates,
    flows: trend.flows,
  });
  const sums = forecastSums(f, t);

  if (!sums) {
    return (
      <Card className="grid max-w-xl gap-3 p-4">
        <p>{t.common.needsBalances}</p>
        <RefreshButton variant="default" />
      </Card>
    );
  }

  // Only what falls inside the forecast: annual income (the May/June bonus and tax refund stay
  // out when the forecast ends earlier) and the spending of each month.
  const annual = trend.annual.filter((a) => f.months.some((m) => m.month.slice(5) === a.sourceMonth.slice(5)));
  const spending = trend.spendingByCycle.filter((g) => f.months.some((m) => m.month === g.month));
  const rows = forecastRows(f, t, { annual, cycle: trend.currentCycle, spendingByCycle: spending });
  const possible = possibleSpending(
    trend,
    spending.map((g) => g.month),
  );
  const points: BalancePoint[] = [
    { key: "today", balance: sums.balanceToday, income: 0, spending: 0, expenses: 0 },
    ...f.months.map((m) => ({ key: m.month, balance: m.balance ?? 0, income: m.expectedIncome, spending: m.expectedSpending, expenses: m.expenses })),
  ];
  // The amount of a whole month (the current month only has what is left) and how many were adjusted by hand.
  const typicalMonth = spending.find((g) => g.month !== f.currentMonth) ?? spending[0];
  const adjusted = spending.filter((g) => g.override != null).length;
  const categoryName = (name: string) => name || t.trend.uncategorised;

  return (
    <div className="grid gap-6 md:grid-cols-12 md:items-start">
      {trend.warnings.length > 0 && (
        <div className="grid gap-2 md:col-span-12">
          {trend.warnings.map((w) => (
            <Alert key={w.code} variant="warning">
              <TriangleAlert aria-hidden />
              <span>{warningText(t, w)}</span>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:col-span-12 md:grid-cols-12 md:items-start md:gap-6">
        <Section id="projected-balance" title={t.common.projectedBalance} className="md:col-span-7">
          <Card className="py-3 pr-2 pl-1">
            <BalanceChart points={points} reserve={f.reserve} milestones={f.milestones.map((x) => ({ key: x.month, title: t.milestones[x.kind].title }))} />
          </Card>
        </Section>
        {/* The space at the top lines the card up with the chart's, which has a title. */}
        <section aria-label={t.forecast.sumsLabel} className="md:col-span-5 md:pt-13">
          <ForecastSums sums={sums} />
        </section>
      </div>

      <Section id="month-by-month" title={t.forecast.monthByMonth} className="md:col-span-12">
        <MonthByMonth balanceToday={sums.balanceToday} rows={rows} />
        {f.beyondHorizon.count > 0 && (
          <p className="text-ink-muted px-1 text-sm">{t.forecast.beyondHorizon(f.beyondHorizon.count, formatEuros(t, f.beyondHorizon.amount, { whole: true }))}</p>
        )}
      </Section>

      {typicalMonth && (
        <Section id="monthly-spending" title={t.common.monthlySpending} className="md:col-span-6">
          <Card className="grid gap-2 p-4">
            <p>
              <Amount v={typicalMonth.automatic} whole className="font-medium" /> {t.forecast.perMonth} ·{" "}
              {adjusted ? t.forecast.monthsAdjusted(adjusted) : t.forecast.automatic}
            </p>
            {possible.map((x) => (
              <p key={x.month} className="text-ink-muted text-sm">
                {t.forecast.lastYear(
                  capitalize(longMonth(t, x.month)),
                  x.peaks.map((g) => `${categoryName(g.name)} ${formatEuros(t, g.total, { whole: true })}`).join(", "),
                )}
              </p>
            ))}
            <Button asChild variant="outline" className="justify-self-end">
              <Link href="/forecast/spending">{t.forecast.adjust}</Link>
            </Button>
          </Card>
        </Section>
      )}

      {trend.components.length > 0 && (
        <div className="md:col-span-6">
          <HowCalculated components={trend.components} annual={annual} />
        </div>
      )}
    </div>
  );
}
