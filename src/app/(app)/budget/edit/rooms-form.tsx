"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { createRoom, deleteRoom, saveRooms } from "@/actions/rooms";
import type { ActionState } from "@/actions/state";
import { ActionBar } from "@/components/action-bar";
import { ActionMessage } from "@/components/action-message";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { ROOM_NAME_MAX } from "@/lib/domain";
import { toInputAmount } from "@/lib/format";

export interface EditableRoom {
  id: number;
  name: string;
  /** null = no limit */
  limit: number | null;
  expenseCount: number;
}

/** Names and limits of every room, saved with a single "Save". Deleting asks for confirmation. */
export function RoomsForm({ rooms }: { rooms: EditableRoom[] }) {
  const t = useT();
  const [state, action, saving] = useActionState<ActionState, FormData>(saveRooms, null);
  const [deleted, setDeleted] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    // The key changes when what is saved changes, so the fields show what was kept.
    <form
      key={rooms.map((r) => `${r.id}:${r.name}:${r.limit}`).join("|")}
      action={(f) => {
        setDeleted(null);
        return action(f);
      }}
      className="grid gap-3"
    >
      <Card>
        <ul className="divide-y">
          {rooms.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2 gap-y-3 p-4">
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor={`name-${r.id}`}>{t.rooms.name}</Label>
                <Input id={`name-${r.id}`} name={`name:${r.id}`} defaultValue={r.name} maxLength={ROOM_NAME_MAX} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`limit-${r.id}`}>{t.rooms.limit}</Label>
                <EuroField
                  id={`limit-${r.id}`}
                  name={`budget:${r.id}`}
                  defaultValue={r.limit == null ? "" : toInputAmount(t, r.limit)}
                  placeholder={t.rooms.noLimit}
                />
              </div>
              <ConfirmDialog
                title={t.rooms.deleteConfirm(r.name)}
                description={r.expenseCount > 0 ? t.rooms.deleteDescription(r.expenseCount) : undefined}
                confirmText={t.rooms.delete}
                onConfirm={async () => setDeleted(await deleteRoom(r.id))}
              >
                <Button type="button" variant="ghost" size="icon" className="text-negative" aria-label={t.rooms.deleteLabel(r.name)} disabled={saving}>
                  <Trash2 aria-hidden />
                </Button>
              </ConfirmDialog>
            </li>
          ))}
        </ul>
      </Card>

      <ActionBar>
        <ActionMessage state={deleted ?? state} className="md:order-last" />
        <Button type="submit" disabled={saving}>
          {saving ? t.common.saving : t.common.save}
        </Button>
      </ActionBar>
    </form>
  );
}

/** A new room: a name and, optionally, a limit. */
export function NewRoomForm() {
  const t = useT();
  const [state, action, saving] = useActionState<ActionState, FormData>(createRoom, null);
  // After adding, clear the fields (with an error, keep what was typed).
  const key = state?.ok ? state.at : "new";

  return (
    <Card className="p-4">
      <form key={key} action={action} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="new-name">{t.rooms.name}</Label>
          <Input id="new-name" name="name" maxLength={ROOM_NAME_MAX} required placeholder={t.rooms.namePlaceholder} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-limit">{t.rooms.limitOptional}</Label>
          <EuroField id="new-limit" name="budget" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit" variant="outline" className="max-sm:w-full" disabled={saving}>
            <Plus aria-hidden />
            {saving ? t.rooms.adding : t.budget.addRoom}
          </Button>
          <ActionMessage state={state} />
        </div>
      </form>
    </Card>
  );
}

function EuroField(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input inputMode="decimal" autoComplete="off" className="pr-8 tabular-nums" {...props} />
      <span className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
    </div>
  );
}
