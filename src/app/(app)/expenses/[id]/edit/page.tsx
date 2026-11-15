import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateExpense } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expense-form";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { getMilestoneDates, listRooms, userNames } from "@/lib/data";
import { NO_ROOM } from "@/lib/domain";
import { shortDate, toInputAmount } from "@/lib/format";
import { dayOf } from "@/lib/months";
import { DeleteExpense } from "./delete-expense";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.editExpense };
}

export default async function EditExpensePage({ params }: PageProps<"/expenses/[id]/edit">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [t, [e], dates, rooms, names] = await Promise.all([
    getT(),
    db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).limit(1),
    getMilestoneDates(),
    listRooms(),
    userNames(),
  ]);
  if (!e) notFound();

  const name = (email: string | null) => (email ? (names.get(email) ?? email) : null);
  const history = [
    e.createdBy && t.expenses.createdBy(name(e.createdBy)!),
    e.status === "paid" && e.paidBy && e.paidAt && t.expenses.paidBy(name(e.paidBy)!, shortDate(t, dayOf(e.paidAt))),
  ].filter(Boolean);

  return (
    <>
      <ExpenseForm
        action={updateExpense.bind(null, e.id)}
        submitText={t.common.save}
        dates={dates}
        rooms={rooms}
        initial={{
          description: e.description,
          amount: toInputAmount(t, e.amount),
          month: e.month,
          when: e.atDeed ? "deed" : e.atConstructionEnd ? "construction" : "month",
          category: e.category,
          room: e.roomId != null ? String(e.roomId) : NO_ROOM,
          status: e.status,
          note: e.note,
        }}
      />
      <div className="grid max-w-xl gap-2 border-t pt-4">
        <DeleteExpense id={e.id} description={e.description} />
        {history.length > 0 && <p className="text-ink-muted text-sm">{history.join(" · ")}</p>}
      </div>
    </>
  );
}
