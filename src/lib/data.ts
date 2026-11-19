// Reads shared by the pages.
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { computeAvailable, markIncluded } from "./accounts";
import type { BudgetRoom } from "./budget";
import type { Category, Status } from "./domain";
import type { MilestoneDates } from "./milestones";
import { computeTrend, type Trend } from "./trend";

export async function getSettings() {
  const [s] = await db.select().from(schema.settings).limit(1);
  if (s) return s;
  const [created] = await db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(schema.settings).limit(1))[0];
}

export async function getAccounts() {
  const [accounts, settings] = await Promise.all([db.select().from(schema.accounts).orderBy(asc(schema.accounts.name)), getSettings()]);
  const withSelection = markIncluded(accounts, settings.selectedAccounts);
  return {
    accounts: withSelection,
    available: computeAvailable(withSelection),
    manualSelection: settings.selectedAccounts != null,
    reserve: settings.reserve,
  };
}

/** Dates of the deed and of the end of construction. */
export async function getMilestoneDates(): Promise<MilestoneDates> {
  const s = await getSettings();
  return { deedDate: s.deedDate, constructionEndDate: s.constructionEndDate };
}

/** Day-to-day spending written by hand, by cycle. */
async function getSpendingOverrides(): Promise<Map<string, number>> {
  const o = schema.spendingOverrides;
  const rows = await db.select({ month: o.month, amount: o.amount }).from(o);
  return new Map(rows.map((r) => [r.month, r.amount]));
}

/** Day-to-day forecast from the transactions stored in the last sync. */
export async function getTrend(): Promise<Trend> {
  const t = schema.transactions;
  const transactions = await db
    .select({
      month: t.month,
      amount: t.amount,
      currency: t.currency,
      categoryId: t.categoryId,
      parentCategoryId: t.parentCategoryId,
      categoryName: t.categoryName,
      categoryGroup: t.categoryGroup,
      note: t.note,
      date: t.date,
      isTransfer: t.isTransfer,
    })
    .from(t);
  return computeTrend({ transactions, spendingOverrides: await getSpendingOverrides() });
}

/** Rooms of the house, in the order they were created. */
export async function listRooms(): Promise<BudgetRoom[]> {
  const r = schema.rooms;
  return db.select({ id: r.id, name: r.name, budget: r.budget }).from(r).orderBy(asc(r.id));
}

/** Map email -> first name, to show who did what. */
export async function userNames(): Promise<Map<string, string>> {
  const rows = await db.select({ email: schema.users.email, name: schema.users.name }).from(schema.users);
  return new Map(rows.map((u) => [u.email, u.name.split(" ")[0] || u.name]));
}

export interface ExpenseView {
  id: number;
  description: string;
  amount: number;
  month: string;
  category: Category;
  status: Status;
  note: string;
  atDeed: boolean;
  atConstructionEnd: boolean;
  /** null = no room */
  roomId: number | null;
  room: string | null;
  createdBy: string | null;
  createdAt: Date;
  paidBy: string | null;
  paidAt: Date | null;
}

/** Every expense, with its room and the names of who created it and who marked it as paid. */
export async function listExpenses(): Promise<ExpenseView[]> {
  const [rows, names, rooms] = await Promise.all([
    db.select().from(schema.expenses).orderBy(asc(schema.expenses.month), asc(schema.expenses.id)),
    userNames(),
    listRooms(),
  ]);
  const roomNames = new Map(rooms.map((r) => [r.id, r.name]));
  const name = (email: string | null) => (email ? (names.get(email) ?? email) : null);
  return rows.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    month: e.month,
    category: e.category,
    status: e.status,
    note: e.note,
    atDeed: e.atDeed,
    atConstructionEnd: e.atConstructionEnd,
    roomId: e.roomId,
    room: e.roomId != null ? (roomNames.get(e.roomId) ?? null) : null,
    createdBy: name(e.createdBy),
    createdAt: e.createdAt,
    paidBy: name(e.paidBy),
    paidAt: e.paidAt,
  }));
}
