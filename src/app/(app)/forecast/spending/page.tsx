import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getAccounts, getMilestoneDates, getTrend, listExpenses } from "@/lib/data";
import { computeForecast } from "@/lib/forecast";
import { possibleSpending } from "@/lib/forecast-view";
import { capitalize, formatEuros, longMonth } from "@/lib/format";
import { SpendingForm } from "./spending-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.monthlySpending };
}

export default async function MonthlySpendingPage() {
  const [t, expenses, accounts, dates, trend] = await Promise.all([getT(), listExpenses(), getAccounts(), getMilestoneDates(), getTrend()]);
  const f = computeForecast({
    expenses,
    available: accounts.available,
    reserve: accounts.reserve,
    ...dates,
    flows: trend.flows,
  });
  // Only the months the forecast shows.
  const spending = trend.spendingByCycle.filter((g) => f.months.some((m) => m.month === g.month));
  const possible = possibleSpending(
    trend,
    spending.map((g) => g.month),
  );

  if (spending.length === 0) {
    return (
      <Card className="max-w-xl p-4">
        <p>{t.spending.noTransactions}</p>
      </Card>
    );
  }

  return (
    <SpendingForm
      months={spending.map((g) => {
        const peaks = possible.find((x) => x.month === g.month)?.peaks;
        return {
          month: g.month,
          title: capitalize(longMonth(t, g.month)) + (g.month === f.currentMonth ? t.spending.restOfMonth : ""),
          automatic: g.automatic,
          override: g.override,
          hint: peaks
            ? t.spending.lastYear(peaks.map((x) => `${x.name || t.trend.uncategorised} ${formatEuros(t, x.total, { whole: true })}`).join(", "))
            : undefined,
        };
      })}
    />
  );
}
