import { ChevronRight, Plus, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { BarLegend, BudgetBar } from "@/components/budget-bar";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Messages } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { computeBudget, type BudgetTotals } from "@/lib/budget";
import { listExpenses, listRooms } from "@/lib/data";
import type { Category } from "@/lib/domain";
import { totalsByCategory } from "@/lib/grouping";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.budget };
}

const ROW =
  "focus-visible:ring-ring/50 hover:bg-surface-muted/50 grid gap-1.5 px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-inset";

export default async function BudgetPage() {
  const [t, rooms, expenses] = await Promise.all([getT(), listRooms(), listExpenses()]);
  const b = computeBudget(rooms, expenses);
  const o = b.overall;
  const hasLimit = rooms.some((r) => r.budget != null);
  const categories = totalsByCategory(expenses);
  const largestCategory = Math.max(1, ...categories.map((c) => c.total));

  return (
    // On phones, one column in code order: total, rooms and categories.
    // From md up, the rooms sit on the right, next to the total and the categories.
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      {rooms.length > 0 && (
        <Card className="grid gap-3 p-4">
          <div className="grid gap-1">
            <h2 className="text-ink-muted text-sm">{t.budget.spent}</h2>
            <p className="text-2xl font-semibold">
              <Amount v={o.total} whole />
              {hasLimit && (
                <span className="text-ink-muted text-base font-normal">
                  {" "}
                  {t.budget.of} <Amount v={o.budget} whole />
                </span>
              )}
            </p>
          </div>
          <BudgetBar paid={o.paid} unpaid={o.unpaid} limit={hasLimit ? o.budget : null} />
          <BarLegend paid={o.paid} unpaid={o.unpaid} />
          {hasLimit && <Standing t={t} remaining={o.remaining} />}
          {o.overCount > 0 && (
            <p className="text-warning flex items-center gap-1.5 text-sm font-medium">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              {t.budget.roomsOver(o.overCount)}
            </p>
          )}
        </Card>
      )}

      <Section
        id="rooms"
        title={t.budget.rooms}
        className="md:col-start-2 md:row-span-2 md:row-start-1"
        action={
          rooms.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/budget/edit">{t.common.edit}</Link>
            </Button>
          )
        }
      >
        {rooms.length === 0 ? (
          <Card className="grid justify-items-start gap-3 p-4">
            <p>{t.budget.noRooms}</p>
            <Button asChild className="max-sm:w-full">
              <Link href="/budget/edit">
                <Plus aria-hidden />
                {t.budget.addRoom}
              </Link>
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {b.rooms.map((r) => (
                <li key={r.id}>
                  {/* The row opens the room's expenses. */}
                  <Link href={`/expenses?show=all&room=${r.id}`} className={ROW}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium wrap-break-word">{r.name}</span>
                      <ChevronRight className="text-ink-muted size-4 shrink-0" aria-hidden />
                    </span>
                    <span className="text-ink-muted text-sm">
                      <Amount v={r.total} whole className="text-ink" />{" "}
                      {r.budget != null ? (
                        <>
                          {t.budget.of} <Amount v={r.budget} whole />
                        </>
                      ) : (
                        t.budget.noLimit
                      )}
                    </span>
                    {r.budget != null && <BudgetBar paid={r.paid} unpaid={r.unpaid} limit={r.budget} />}
                    <Standing t={t} remaining={r.remaining} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {b.unassigned.expenseCount > 0 && <NoRoom t={t} totals={b.unassigned} />}
      </Section>

      {categories.length > 0 && (
        <Section id="categories" title={t.budget.categories} className="md:col-start-1">
          <Card className="grid gap-4 p-4">
            <ul className="grid gap-4">
              {categories.map((c) => (
                <li key={c.category} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{t.categories[c.category as Category]}</span>
                    <Amount v={c.total} whole className="font-medium" />
                  </div>
                  <BudgetBar paid={c.paid} unpaid={c.unpaid} scale={largestCategory} />
                </li>
              ))}
            </ul>
            <BarLegend />
          </Card>
        </Section>
      )}
    </div>
  );
}

/** "Disponível 600 €" or, when over, "Acima do limite 300 €" (a warning, not an error: the budget is only a comparison). */
function Standing({ t, remaining }: { t: Messages; remaining: number | null }) {
  if (remaining == null) return null;
  if (remaining < 0) {
    return (
      <span className="text-warning flex items-center gap-1.5 text-sm font-medium">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span>
          {t.budget.overLimit} <Amount v={-remaining} whole />
        </span>
      </span>
    );
  }
  return (
    <span className="text-ink-muted text-sm">
      {t.budget.left} <Amount v={remaining} whole className="text-ink" />
    </span>
  );
}

/** Expenses with no room stay outside the budget: they show up apart, only when there are any. */
function NoRoom({ t, totals }: { t: Messages; totals: BudgetTotals }) {
  return (
    <Card className="overflow-hidden">
      <Link href="/expenses?show=all&room=none" className={ROW}>
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">{t.budget.noRoom}</span>
          <ChevronRight className="text-ink-muted size-4 shrink-0" aria-hidden />
        </span>
        <span className="text-ink-muted text-sm">
          <Amount v={totals.total} whole className="text-ink" /> {t.budget.outsideBudget}
        </span>
      </Link>
    </Card>
  );
}
