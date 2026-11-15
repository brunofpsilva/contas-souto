"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getMilestoneDates } from "@/lib/data";
import { validateExpense, type ExpenseErrors } from "@/lib/validation";

export type ExpenseFormState = {
  errors: ExpenseErrors;
  message?: string;
  /** What was submitted, so the form doesn't lose what was typed. */
  values: Record<string, string>;
} | null;

const e = schema.expenses;

function readForm(form: FormData): Record<string, string> {
  const fields = ["description", "amount", "month", "when", "category", "room", "status", "note"] as const;
  return Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? "")]));
}

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/** The chosen room may have been deleted in the meantime (by someone else). */
async function roomExists(id: number | null): Promise<boolean> {
  if (id == null) return true;
  const [r] = await db.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.id, id)).limit(1);
  return Boolean(r);
}

export async function createExpense(_previous: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  const me = await requireUser();
  const t = await getT();
  const values = readForm(form);
  const r = validateExpense(values, await getMilestoneDates(), t);
  if (!r.ok) return { errors: r.errors, values };
  if (!(await roomExists(r.expense.roomId))) return { errors: { roomId: t.expenseForm.roomGone }, values };

  const paid = r.expense.status === "paid";
  await db.insert(e).values({
    ...r.expense,
    createdBy: me.email,
    updatedBy: me.email,
    paidBy: paid ? me.email : null,
    paidAt: paid ? new Date() : null,
  });

  revalidatePath("/", "layout");
  redirect(form.get("next") === "another" ? "/expenses/new?added=1" : "/expenses");
}

export async function updateExpense(id: number, _previous: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  const me = await requireUser();
  const t = await getT();
  const values = readForm(form);
  if (!isValidId(id)) return { errors: {}, message: t.expenses.gone, values };

  const [current] = await db.select().from(e).where(eq(e.id, id)).limit(1);
  if (!current) return { errors: {}, message: t.expenses.gone, values };

  const r = validateExpense(values, await getMilestoneDates(), t);
  if (!r.ok) return { errors: r.errors, values };
  if (!(await roomExists(r.expense.roomId))) return { errors: { roomId: t.expenseForm.roomGone }, values };

  const becamePaid = r.expense.status === "paid" && current.status !== "paid";
  const isPlanned = r.expense.status !== "paid";
  await db
    .update(e)
    .set({
      ...r.expense,
      updatedBy: me.email,
      updatedAt: new Date(),
      ...(becamePaid ? { paidBy: me.email, paidAt: new Date() } : {}),
      ...(isPlanned ? { paidBy: null, paidAt: null } : {}),
    })
    .where(eq(e.id, id));

  revalidatePath("/", "layout");
  redirect("/expenses");
}

/** Deletes the expense and goes back to the list. Only returns something if it goes wrong. */
export async function deleteExpense(id: number): Promise<{ ok: false; message: string }> {
  await requireUser();
  const t = await getT();
  if (!isValidId(id)) return { ok: false, message: t.common.somethingWrong };
  const rows = await db.delete(e).where(eq(e.id, id)).returning({ id: e.id });
  revalidatePath("/", "layout");
  if (!rows.length) return { ok: false, message: t.expenses.gone };
  redirect("/expenses");
}
