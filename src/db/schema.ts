import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { CATEGORIES, DESCRIPTION_MAX, NOTE_MAX, ROOM_NAME_MAX, STATUSES, SYNC_SOURCES } from "../lib/domain";

export const categoryEnum = pgEnum("expense_category", CATEGORIES);
export const statusEnum = pgEnum("expense_status", STATUSES);
export const syncSourceEnum = pgEnum("sync_source", SYNC_SOURCES);

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();

/** Who has signed in to the app (updated on every sign-in). Used to show names instead of emails. */
export const users = pgTable("users", {
  email: text().primaryKey(),
  name: text().notNull(),
  createdAt: now(),
  lastLoginAt: now(),
});

/** Rooms of the house (editable in the app). An expense without a room is "No room". */
export const rooms = pgTable(
  "rooms",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: ROOM_NAME_MAX }).notNull(),
    /** Maximum budget; null = no budget. */
    budget: numeric({ precision: 12, scale: 2, mode: "number" }),
    createdBy: text().references(() => users.email),
    createdAt: now(),
    updatedBy: text().references(() => users.email),
    updatedAt: now(),
  },
  (t) => [check("rooms_budget_positive", sql`${t.budget} >= 0`), uniqueIndex("rooms_name_unique").on(sql`lower(${t.name})`)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    description: varchar({ length: DESCRIPTION_MAX }).notNull(),
    amount: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
    /** YYYY-MM */
    month: char({ length: 7 }).notNull(),
    category: categoryEnum().notNull().default("other"),
    status: statusEnum().notNull().default("planned"),
    note: varchar({ length: NOTE_MAX }).notNull().default(""),
    /**
     * Paid at the deed signing: the month follows the deed date (the actions update it whenever
     * the date changes). Without a date set, the stored month counts.
     */
    atDeed: boolean().notNull().default(false),
    /** Paid at the end of construction (to the contractor): like `atDeed`, with the construction date. */
    atConstructionEnd: boolean().notNull().default(false),
    /** Room of the house; null = no room (also when the room is deleted). */
    roomId: integer().references(() => rooms.id, { onDelete: "set null" }),

    createdBy: text().references(() => users.email),
    createdAt: now(),
    updatedBy: text().references(() => users.email),
    updatedAt: now(),
    paidBy: text().references(() => users.email),
    paidAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} >= 0`),
    check("expenses_month_format", sql`${t.month} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    // A planned expense doesn't store who paid.
    check("expenses_paid_consistent", sql`${t.status} = 'paid' OR (${t.paidAt} IS NULL AND ${t.paidBy} IS NULL)`),
    // Paid at the deed or at the end of construction, never both.
    check("expenses_one_milestone", sql`NOT (${t.atDeed} AND ${t.atConstructionEnd})`),
    index("expenses_status_month_idx").on(t.status, t.month),
    index("expenses_room_idx").on(t.roomId),
  ],
);

/** Latest snapshot of the Wallet accounts (replaced on every sync). */
export const accounts = pgTable("accounts", {
  id: text().primaryKey(), // Wallet id
  name: text().notNull(),
  type: text().notNull().default(""),
  balance: numeric({ precision: 14, scale: 2, mode: "number" }).notNull(),
  currency: char({ length: 3 }).notNull().default("EUR"),
  syncedAt: timestamp({ withTimezone: true }).notNull(),
});

/**
 * Wallet transactions of the last 12 months (replaced on every update).
 * Only from the synced accounts; used to forecast salaries and day-to-day spending.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: text().primaryKey(), // Wallet id
    accountId: text().notNull(),
    date: timestamp({ withTimezone: true }).notNull(),
    /** YYYY-MM in Lisbon time */
    month: char({ length: 7 }).notNull(),
    /** Signed: negative = money out. */
    amount: numeric({ precision: 14, scale: 2, mode: "number" }).notNull(),
    currency: char({ length: 3 }).notNull().default("EUR"),
    categoryId: text(),
    /** Base category, when the category is a custom one. */
    parentCategoryId: text(),
    categoryName: text().notNull().default(""),
    categoryGroup: text().notNull().default(""),
    note: varchar({ length: NOTE_MAX }).notNull().default(""),
    isTransfer: boolean().notNull().default(false),
    syncedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index("transactions_month_idx").on(t.month)],
);

/** A single row (id = 1) with the shared settings. */
export const settings = pgTable(
  "settings",
  {
    id: integer().primaryKey().default(1),
    reserve: numeric({ precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    /** null = by default the accounts with a positive balance count. */
    selectedAccounts: text().array(),
    /** YYYY-MM-DD; null = no date yet. The forecast runs up to this date. */
    deedDate: date({ mode: "string" }),
    /** YYYY-MM-DD; null = no date yet. Day the end of construction is paid to the contractor. */
    constructionEndDate: date({ mode: "string" }),
    updatedBy: text().references(() => users.email),
    updatedAt: now(),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`), check("settings_reserve_positive", sql`${t.reserve} >= 0`)],
);

/** Day-to-day spending and rent written by hand for a cycle (replaces the automatic forecast). */
export const spendingOverrides = pgTable(
  "spending_overrides",
  {
    /** Cycle YYYY-MM. In the current cycle, it is what is still to be spent. */
    month: char({ length: 7 }).primaryKey(),
    amount: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
    updatedBy: text().references(() => users.email),
    updatedAt: now(),
  },
  (t) => [check("spending_overrides_amount_positive", sql`${t.amount} >= 0`)],
);

/** Log of every sync with Wallet (manual or from the cron). */
export const syncs = pgTable(
  "syncs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    source: syncSourceEnum().notNull(),
    startedBy: text().references(() => users.email),
    startedAt: now(),
    finishedAt: timestamp({ withTimezone: true }),
    ok: boolean(),
    message: text(),
    errorCode: text(),
    accountCount: integer(),
    /** Transactions read in this sync (null = the transactions were not updated). */
    transactionCount: integer(),
    /** Wallet said it was still syncing (X-Sync-In-Progress). */
    walletSyncing: boolean().notNull().default(false),
  },
  (t) => [index("syncs_started_idx").on(t.startedAt)],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Sync = typeof syncs.$inferSelect;
export type User = typeof users.$inferSelect;
