import { ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { ForecastStatus } from "@/components/forecast-status";
import { RefreshButton } from "@/components/refresh-button";
import { Section } from "@/components/section";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getAccounts, getMilestoneDates, getTrend, listExpenses } from "@/lib/data";
import { computeForecast } from "@/lib/forecast";
import { formatDateTime, formatEuros, shortDate } from "@/lib/format";
import { homeSummary, milestoneCards } from "@/lib/home";
import { dayOf } from "@/lib/months";
import { PRIVATE } from "@/lib/privacy";
import { syncStatus } from "@/lib/sync";
import { cn } from "@/lib/utils";

const LINK = "text-brand focus-visible:ring-ring/50 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3";

/**
 * Home answers one question: is there enough money, and how much is left? Under the status, one
 * card per upcoming milestone. The expense lists are in the other tabs.
 */
export default async function HomePage() {
  const [t, expenses, accounts, status, dates, trend] = await Promise.all([
    getT(),
    listExpenses(),
    getAccounts(),
    syncStatus(),
    getMilestoneDates(),
    getTrend(),
  ]);
  const f = computeForecast({
    expenses,
    available: accounts.available,
    reserve: accounts.reserve,
    ...dates,
    flows: trend.flows,
  });
  const s = f.summary;
  const summary = homeSummary(f, t);
  const cards = milestoneCards(f, expenses, dayOf(new Date()));
  const noDates = !dates.deedDate && !dates.constructionEndDate;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-6">
      <div className="grid gap-3">
        <Card className="grid gap-1 p-4">
          <ForecastStatus tone={summary.tone}>{summary.title}</ForecastStatus>
          {summary.amount != null ? (
            <>
              {/* The big number. The colour is on the inner span: "text-figure" and "text-negative" together cancelled each other. */}
              <p className="text-figure mt-2 font-semibold">
                <span className="sr-only">{t.home.projectedBalanceSr}</span>
                <span className={cn(PRIVATE, summary.amount < 0 && "text-negative")}>{formatEuros(t, summary.amount, { whole: true })}</span>
              </p>
              <p className="text-ink-muted text-sm">{summary.context}</p>
              {summary.extra && (
                <p className="text-ink-muted text-sm">
                  {summary.extra.text}: <Amount v={summary.extra.amount} whole private className="text-ink font-medium" />
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-ink-muted mt-2 text-sm">{t.common.needsBalances}</p>
              <RefreshButton variant="default" className="mt-3" />
            </>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-2">
            <Link href="/settings#accounts" className="focus-visible:ring-ring/50 grid min-h-11 content-center rounded-sm outline-none focus-visible:ring-3">
              <span className="text-ink-muted text-sm">{t.common.balanceToday}</span>
              <Amount v={s.available} whole private className="font-medium" />
            </Link>
            <Link
              href="/expenses?show=unpaid"
              className="focus-visible:ring-ring/50 grid min-h-11 content-center justify-items-end rounded-sm outline-none focus-visible:ring-3"
            >
              <span className="text-ink-muted text-sm">{t.common.toPay}</span>
              <Amount v={s.unpaid} whole className="font-medium" />
            </Link>
          </div>
        </Card>

        {status.lastError ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <span>
              {t.common.lastUpdateFailed}{" "}
              <Link href="/settings#accounts" className="font-medium underline underline-offset-4">
                {t.common.view}
              </Link>
            </span>
          </Alert>
        ) : (
          status.lastOk && (
            <p className="text-ink-muted px-1 text-xs">{t.common.updated(formatDateTime(t, status.lastOk.finishedAt ?? status.lastOk.startedAt))}</p>
          )
        )}

      </div>

      <Section
        id="milestones"
        title={t.home.milestones}
        action={
          cards.length > 0 && (
            <Link href="/forecast" className={cn(LINK, "flex min-h-11 items-center text-sm")}>
              {t.home.seeForecast}
            </Link>
          )
        }
      >
        {cards.length > 0 ? (
          cards.map((c) => (
            <Card key={c.kind} className="grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-semibold">{t.milestones[c.kind].title}</h3>
                <span className="text-ink-muted text-sm">
                  {shortDate(t, c.date)} · {t.home.daysLeft(c.daysLeft)}
                </span>
              </div>
              <dl className="grid gap-1.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-muted">{c.since ? t.home.toPaySince(t.milestones[c.since].after) : t.home.toPayUntil}</dt>
                  <dd className="text-right">
                    {c.toPayCount > 0 ? (
                      <>
                        <span className="text-ink-muted">{t.expenseCount(c.toPayCount)} · </span>
                        <Amount v={c.toPay} whole className="font-medium" />
                      </>
                    ) : (
                      t.home.nothingToPay
                    )}
                  </dd>
                </div>
                {c.balanceAfter != null && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-muted">{t.home.balanceAfter}</dt>
                    <dd>
                      <Amount
                        v={c.balanceAfter}
                        whole
                        private
                        className={cn("font-medium", c.tone === "negative" && "text-negative", c.tone === "warning" && "text-warning")}
                      />
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          ))
        ) : (
          <Card>
            <Link
              href="/settings#dates"
              className="focus-visible:ring-ring/50 flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 outline-none focus-visible:ring-3"
            >
              <span>{noDates ? t.home.noDates : t.home.datesPassed}</span>
              <span className="text-brand flex items-center gap-1 font-medium">
                {noDates ? t.common.set : t.common.edit}
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </Link>
          </Card>
        )}
      </Section>
    </div>
  );
}
