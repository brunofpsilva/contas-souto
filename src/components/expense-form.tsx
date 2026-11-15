"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ExpenseFormState } from "@/actions/expenses";
import { ActionBar } from "@/components/action-bar";
import { SegmentedChoice } from "@/components/segmented";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import { CATEGORIES, DESCRIPTION_MAX, NO_ROOM, NOTE_MAX } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import { milestoneDate, type Milestone, type MilestoneDates } from "@/lib/milestones";
import { cn } from "@/lib/utils";

export interface ExpenseValues {
  description: string;
  amount: string;
  month: string;
  /** "month", "deed" or "construction" */
  when: string;
  category: string;
  /** Room id, or "none" (no room) */
  room: string;
  status: string;
  note: string;
}

export function ExpenseForm({
  action,
  initial,
  submitText,
  dates,
  rooms,
  allowAnother = false,
}: {
  action: (previous: ExpenseFormState, form: FormData) => Promise<ExpenseFormState>;
  initial: ExpenseValues;
  submitText: string;
  dates: MilestoneDates;
  rooms: { id: number; name: string }[];
  allowAnother?: boolean;
}) {
  const t = useT();
  const f = t.expenseForm;
  const [state, submit, saving] = useActionState(action, null);
  const v = { ...initial, ...state?.values };
  const errors = state?.errors ?? {};
  // After a submission with errors, mount the fields again with what was typed.
  const key = state ? JSON.stringify(state.values) : "initial";

  return (
    // On phones, the bottom of the form leaves room for the buttons fixed at the bottom.
    <form action={submit} className={cn("grid max-w-xl gap-5", allowAnother && "max-md:pb-14")} noValidate key={key}>
      {state?.message && (
        <Alert variant="negative" role="alert">
          {state.message}
        </Alert>
      )}

      <Field id="description" label={f.description} error={errors.description}>
        <Input
          id="description"
          name="description"
          defaultValue={v.description}
          maxLength={DESCRIPTION_MAX}
          required
          autoFocus={!initial.description}
          autoCapitalize="sentences"
          enterKeyHint="next"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
      </Field>

      <Field id="amount" label={f.amount} error={errors.amount}>
        <div className="relative">
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            defaultValue={v.amount}
            placeholder={f.amountPlaceholder}
            required
            className="pr-8 tabular-nums"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
          />
          <span className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
        </div>
      </Field>

      <When initial={v.when} month={v.month} error={errors.month} dates={dates} />

      <SegmentedChoice
        name="status"
        label={f.status}
        options={[
          { value: "planned", text: t.statuses.planned },
          { value: "paid", text: t.statuses.paid },
        ]}
        value={v.status === "paid" ? "paid" : "planned"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label={f.category}>
          <NativeSelect id="category" name="category" defaultValue={v.category}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.categories[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="room" label={f.room} error={errors.roomId}>
          {/* A room deleted in the meantime goes back to no room. */}
          <NativeSelect id="room" name="room" defaultValue={rooms.some((r) => String(r.id) === v.room) ? v.room : NO_ROOM}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            <option value={NO_ROOM}>{t.budget.noRoom}</option>
          </NativeSelect>
        </Field>
      </div>

      <Field id="note" label={f.note} error={errors.note}>
        <Textarea
          id="note"
          name="note"
          defaultValue={v.note}
          maxLength={NOTE_MAX}
          rows={2}
          autoCapitalize="sentences"
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? "note-error" : undefined}
        />
      </Field>

      <ActionBar>
        <Button type="submit" disabled={saving}>
          {saving ? t.common.saving : submitText}
        </Button>
        {allowAnother && (
          <Button type="submit" name="next" value="another" variant="outline" disabled={saving}>
            {f.addAnother}
          </Button>
        )}
      </ActionBar>
    </form>
  );
}

/**
 * In a chosen month, at the deed or at the end of construction. In the last two, the expense gets
 * the milestone date's month and follows it when it changes.
 */
function When({ initial, month, error, dates }: { initial: string; month: string; error?: string; dates: MilestoneDates }) {
  const t = useT();
  const [when, setWhen] = useState(initial === "deed" || initial === "construction" ? initial : "month");
  const milestone = when === "month" ? null : (when as Milestone);
  const date = milestone ? milestoneDate(milestone, dates) : null;
  return (
    <div className="grid gap-2">
      <SegmentedChoice
        name="when"
        label={t.expenseForm.when}
        options={[
          { value: "month", text: t.expenseForm.inMonth },
          { value: "deed", text: t.milestones.deed.title },
          { value: "construction", text: t.milestones.construction.title },
        ]}
        value={when}
        onChange={setWhen}
      />
      {milestone ? (
        <>
          <input type="hidden" name="month" value={month} />
          <p className="text-ink-muted flex flex-wrap items-center gap-x-1 px-1 text-sm">
            {date ? (
              t.expenseForm.followsDate(shortDate(t, date))
            ) : (
              <>
                {t.milestones[milestone].noDate}
                <Link
                  href="/settings#dates"
                  className="text-brand focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-sm px-1 font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
                >
                  {t.common.set}
                </Link>
              </>
            )}
          </p>
        </>
      ) : (
        <Input
          id="month"
          name="month"
          type="month"
          defaultValue={month}
          placeholder={t.expenseForm.monthPlaceholder}
          pattern="\d{4}-\d{2}"
          required
          aria-label={t.expenseForm.month}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "month-error" : undefined}
          className="sm:max-w-xs"
        />
      )}
      {error && (
        <p id="month-error" className="text-negative text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-negative text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
