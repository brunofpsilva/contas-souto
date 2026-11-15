"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { nameKey, validateBudget, validateRoomName, validateRooms } from "@/lib/validation";
import { reply, type ActionState } from "./state";

const r = schema.rooms;

/** Name already used by another room (regardless of case and accents)? */
async function nameTaken(name: string): Promise<boolean> {
  const all = await db.select({ name: r.name }).from(r);
  return all.some((x) => nameKey(x.name) === nameKey(name));
}

/** Violation of the unique name index (two people saving the same name at the same time). */
function isDuplicateName(e: unknown): boolean {
  const code = (x: unknown) => (x && typeof x === "object" && "code" in x ? (x as { code: unknown }).code : undefined);
  return code(e) === "23505" || code((e as { cause?: unknown })?.cause) === "23505";
}

export async function createRoom(_previous: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser();
  const t = await getT();
  const name = validateRoomName(form.get("name"), t);
  if (!name.ok) return reply(false, name.error);
  const budget = validateBudget(form.get("budget"), t);
  if (!budget.ok) return reply(false, budget.error);
  if (await nameTaken(name.name)) return reply(false, t.rooms.exists(name.name));

  try {
    await db.insert(r).values({ name: name.name, budget: budget.amount, createdBy: me.email, updatedBy: me.email });
  } catch (e) {
    if (isDuplicateName(e)) return reply(false, t.rooms.exists(name.name));
    throw e;
  }
  revalidatePath("/", "layout");
  return reply(true, t.rooms.added(name.name));
}

/** Saves the names and limits of every room at once. */
export async function saveRooms(_previous: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireUser();
  const t = await getT();
  const v = validateRooms(form.entries(), t);
  if (!v.ok) return reply(false, v.error);

  const existing = await db.select({ id: r.id, name: r.name }).from(r);
  const sent = new Set(v.rooms.map((x) => x.id));
  // A new name can't clash with a room that wasn't in the form (created in the meantime).
  for (const x of v.rooms) {
    const other = existing.find((e) => !sent.has(e.id) && nameKey(e.name) === nameKey(x.name));
    if (other) return reply(false, t.rooms.exists(other.name));
  }

  const ids = new Set(existing.map((e) => e.id));
  try {
    await db.transaction(async (tx) => {
      for (const x of v.rooms) {
        if (!ids.has(x.id)) continue; // deleted in the meantime
        await tx.update(r).set({ name: x.name, budget: x.budget, updatedBy: me.email, updatedAt: new Date() }).where(eq(r.id, x.id));
      }
    });
  } catch (e) {
    // Swapping the names of two rooms (A↔B) clashes halfway through; simplest is to ask for two steps.
    if (isDuplicateName(e)) return reply(false, t.rooms.swap);
    throw e;
  }

  revalidatePath("/", "layout");
  return reply(true, t.common.saved);
}

export type DeleteResult = { ok: true; message: string } | { ok: false; message: string };

/** Deletes the room; its expenses end up with no room (the database sets room_id to null). */
export async function deleteRoom(id: number): Promise<DeleteResult> {
  await requireUser();
  const t = await getT();
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return { ok: false, message: t.common.somethingWrong };
  const e = schema.expenses;
  const result = await db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(e).where(eq(e.roomId, id));
    const deleted = await tx.delete(r).where(eq(r.id, id)).returning({ name: r.name });
    return { n, name: deleted[0]?.name };
  });
  revalidatePath("/", "layout");
  if (!result.name) return { ok: false, message: t.rooms.gone };
  return { ok: true, message: t.rooms.deleted(result.name, result.n) };
}
