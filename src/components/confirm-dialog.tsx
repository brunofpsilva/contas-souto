"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * Confirmation before deleting: the title asks with the name ("Delete “Sofa”?") and the button
 * repeats the action ("Delete expense"). The child is the button that opens the dialog.
 */
export function ConfirmDialog({
  title,
  description,
  confirmText,
  onConfirm,
  children,
}: {
  title: string;
  description?: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent {...(description ? {} : { "aria-describedby": undefined })}>
        <div className="grid gap-1">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await onConfirm();
                setOpen(false);
              })
            }
          >
            {pending ? t.common.deleting : confirmText}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
