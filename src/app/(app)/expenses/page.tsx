import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { ExpenseRow } from "@/components/expense-row";
import { SegmentedLinks } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { cycleOf } from "@/lib/cycle";
import { getMilestoneDates, listExpenses, listRooms } from "@/lib/data";
import { NO_ROOM } from "@/lib/domain";
import { capitalize, longMonth } from "@/lib/format";
import { groupByMonth } from "@/lib/grouping";
import { newExpenseHref } from "@/lib/routes";
import { RoomFilter } from "./room-filter";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.expenses };
}

// On opening, the list shows what is still to pay (?show=paid and ?show=all show the rest).
const FILTERS = ["unpaid", "paid", "all"] as const;
type Filter = (typeof FILTERS)[number];

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const { show, room } = await searchParams;
  const filter: Filter = FILTERS.find((f) => f === show) ?? "unpaid";
  const [t, all, dates, rooms] = await Promise.all([getT(), listExpenses(), getMilestoneDates(), listRooms()]);
  const currentMonth = cycleOf(new Date());
  // ?room=ID or ?room=none (no room); anything else doesn't filter.
  const ofRoom = room === NO_ROOM ? { id: null, name: t.budget.noRoom } : rooms.find((r) => String(r.id) === room);
  const roomKey = ofRoom ? (ofRoom.id == null ? NO_ROOM : String(ofRoom.id)) : "";

  const list = all.filter((e) => (filter === "all" || (filter === "paid") === (e.status === "paid")) && (!ofRoom || e.roomId === ofRoom.id));
  const groups = groupByMonth(list, currentMonth);
  const total = Math.round(list.reduce((s, e) => s + e.amount, 0) * 100) / 100;

  const href = (f: Filter, r: string) => {
    const q = new URLSearchParams();
    if (f !== "unpaid") q.set("show", f);
    if (r) q.set("room", r);
    const query = q.toString();
    return query ? `/expenses?${query}` : "/expenses";
  };
  const roomOptions = [
    { value: "", text: t.expenses.allRooms },
    ...rooms.map((r) => ({ value: String(r.id), text: r.name })),
    { value: NO_ROOM, text: t.budget.noRoom },
  ].map((o) => ({ ...o, href: href(filter, o.value) }));
  const empty = t.expenses.empty[filter];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,22rem)_minmax(0,16rem)] sm:justify-between">
        <SegmentedLinks
          label={t.expenses.filterLabel}
          options={FILTERS.map((f) => ({ href: href(f, roomKey), text: t.expenses.filters[f], active: f === filter }))}
        />
        {(rooms.length > 0 || ofRoom) && <RoomFilter key={roomKey} value={roomKey} options={roomOptions} />}
      </div>

      {groups.length === 0 ? (
        <Card className="grid justify-items-start gap-3 p-4">
          <p>{ofRoom ? empty.inRoom(ofRoom.name) : empty.all}</p>
          <Button asChild variant="outline" className="max-sm:w-full">
            <Link href={newExpenseHref(ofRoom?.id != null ? String(ofRoom.id) : null)}>
              <Plus aria-hidden />
              {t.common.addExpense}
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          <p className="text-ink-muted flex items-baseline justify-between gap-3 px-1 text-sm">
            <span>{t.expenseCount(list.length)}</span>
            <Amount v={total} className="text-ink font-medium" />
          </p>

          {groups.map((g) => (
            <section key={g.month} aria-labelledby={`month-${g.month}`} className="grid gap-2">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 id={`month-${g.month}`} className="font-semibold">
                  {capitalize(longMonth(t, g.month))}
                </h2>
                <Amount v={g.unpaid + g.paid} className="text-ink-muted text-sm" />
              </div>
              <Card>
                <ul className="divide-y">
                  {g.expenses.map((e) => (
                    <ExpenseRow key={e.id} e={e} dates={dates} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
