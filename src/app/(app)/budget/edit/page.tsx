import type { Metadata } from "next";
import { Section } from "@/components/section";
import { getT } from "@/i18n/server";
import { computeBudget } from "@/lib/budget";
import { listExpenses, listRooms } from "@/lib/data";
import { NewRoomForm, RoomsForm } from "./rooms-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.editRooms };
}

export default async function EditRoomsPage() {
  const [t, rooms, expenses] = await Promise.all([getT(), listRooms(), listExpenses()]);
  // Only to know how many expenses each room has (shown when deleting).
  const rows = computeBudget(rooms, expenses).rooms;

  return (
    // On phones, the bottom leaves room for the "Save" button fixed at the bottom.
    <div className="grid max-w-xl gap-6 max-md:pb-4">
      {rows.length > 0 && <RoomsForm rooms={rows.map((r) => ({ id: r.id, name: r.name, limit: r.budget, expenseCount: r.expenseCount }))} />}
      <Section id="new-room" title={t.rooms.newRoom}>
        <NewRoomForm />
      </Section>
    </div>
  );
}
