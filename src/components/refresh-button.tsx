"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { syncNow } from "@/actions/settings";
import type { ActionState } from "@/actions/state";
import { ActionMessage } from "@/components/action-message";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** "Update balances": fetches balances and transactions from Wallet and says how it went. */
export function RefreshButton({
  variant = "outline",
  className,
  messageClassName,
}: {
  variant?: "default" | "outline";
  className?: string;
  messageClassName?: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<ActionState>(syncNow, null);
  return (
    <>
      <form action={action} className={className}>
        <Button type="submit" variant={variant} className="w-full" disabled={pending}>
          <RefreshCw className={cn(pending && "animate-spin")} aria-hidden />
          {pending ? t.settings.updating : t.settings.updateBalances}
        </Button>
      </form>
      <ActionMessage state={state} className={messageClassName} />
    </>
  );
}
