"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteExpense } from "@/actions/expenses";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** "Delete expense", with confirmation. If it works, the action goes back to the list. */
export function DeleteExpense({ id, description }: { id: number; description: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-1">
      <ConfirmDialog
        title={t.expenses.deleteConfirm(description)}
        confirmText={t.expenses.delete}
        onConfirm={async () => {
          const r = await deleteExpense(id);
          if (r && !r.ok) setError(r.message);
        }}
      >
        <Button type="button" variant="ghost" className="text-negative -ml-4">
          <Trash2 aria-hidden />
          {t.expenses.delete}
        </Button>
      </ConfirmDialog>
      {error && (
        <p role="alert" className="text-negative text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
