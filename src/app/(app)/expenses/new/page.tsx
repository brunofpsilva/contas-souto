import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { createExpense } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expense-form";
import { Alert } from "@/components/ui/alert";
import { getT } from "@/i18n/server";
import { cycleOf } from "@/lib/cycle";
import { getMilestoneDates, listRooms } from "@/lib/data";
import { NO_ROOM } from "@/lib/domain";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.newExpense };
}

export default async function NewExpensePage({ searchParams }: PageProps<"/expenses/new">) {
  const [t, { added, room }, dates, rooms] = await Promise.all([getT(), searchParams, getMilestoneDates(), listRooms()]);
  return (
    <>
      {added && (
        <Alert variant="positive" className="max-w-xl">
          <CircleCheck aria-hidden />
          <span>{t.expenses.added}</span>
        </Alert>
      )}
      <ExpenseForm
        action={createExpense}
        submitText={t.common.addExpense}
        allowAnother
        dates={dates}
        rooms={rooms}
        initial={{
          description: "",
          amount: "",
          month: cycleOf(new Date()),
          when: "month",
          category: "other",
          // Coming from a list filtered by room (?room=ID), it is already chosen.
          room: typeof room === "string" ? room : NO_ROOM,
          status: "planned",
          note: "",
        }}
      />
    </>
  );
}
