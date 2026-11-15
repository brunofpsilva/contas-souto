"use client";

import { TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { saveAccounts } from "@/actions/settings";
import type { ActionState } from "@/actions/state";
import { ActionMessage } from "@/components/action-message";
import { Amount } from "@/components/amount";
import { RefreshButton } from "@/components/refresh-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { PRIVATE } from "@/lib/privacy";
import { cn } from "@/lib/utils";

export interface AccountView {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  included: boolean;
}

/**
 * The Wallet accounts whose balance counts. Ticking or unticking an account saves straight away
 * (what is tapped saves on tap); "Update balances" fetches the amounts from Wallet.
 */
export function WalletAccounts({
  accounts,
  manualSelection,
  updated,
  failure,
  preparing,
}: {
  accounts: AccountView[];
  /** Someone chose the accounts by hand; otherwise the ones with a positive balance count. */
  manualSelection: boolean;
  /** "Atualizado 10 nov, 09:14", or null if there have never been balances. */
  updated: string | null;
  /** Sentence of the last error, if the last update failed. */
  failure: string | null;
  /** Wallet was still preparing data in the last update. */
  preparing: boolean;
}) {
  const t = useT();
  const [response, setResponse] = useState<ActionState>(null);
  const [saving, start] = useTransition();
  const [checked, setChecked] = useState(() => new Set(accounts.filter((a) => a.included).map((a) => a.id)));
  // When the server returns a new selection (for example after resetting to automatic), start from it.
  const key = accounts.map((a) => `${a.id}:${a.included}`).join("|");
  const [previousKey, setPreviousKey] = useState(key);
  if (key !== previousKey) {
    setPreviousKey(key);
    setChecked(new Set(accounts.filter((a) => a.included).map((a) => a.id)));
  }

  const total = Math.round(accounts.filter((a) => checked.has(a.id)).reduce((s, a) => s + a.balance, 0) * 100) / 100;
  const otherCurrencies = accounts.filter((a) => checked.has(a.id) && a.currency !== "EUR");
  const nameOf = (a: AccountView) => a.name || t.settings.unnamedAccount;

  function save(selection: string[] | null) {
    start(async () => setResponse(await saveAccounts(selection)));
  }

  function toggle(id: string, on: boolean) {
    const next = new Set(checked);
    if (on) next.add(id);
    else next.delete(id);
    setChecked(next);
    save([...next]);
  }

  return (
    <div className="grid gap-3">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-4">
          <p className="text-ink-muted text-sm">{updated ?? t.settings.noBalancesYet}</p>
          <RefreshButton messageClassName="basis-full" />
        </div>

        {accounts.length > 0 && (
          <ul className="border-t">
            {accounts.map((a) => {
              const id = `account-${a.id}`;
              return (
                <li key={a.id} className="flex items-center gap-3 border-b pl-4">
                  <Checkbox id={id} checked={checked.has(a.id)} onCheckedChange={(v) => toggle(a.id, v === true)} />
                  {/* The whole row (name and balance) ticks and unticks the account. */}
                  <Label htmlFor={id} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pr-4 font-normal">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-base font-medium">{nameOf(a)}</span>
                      <span className="text-ink-muted text-sm">
                        {t.settings.accountTypes[a.type] ?? (a.type || "—")}
                        {a.currency !== "EUR" && ` · ${a.currency}`}
                      </span>
                    </span>
                    {a.currency === "EUR" ? (
                      <Amount v={a.balance} private className="text-base" />
                    ) : (
                      <span className={cn("text-base tabular-nums whitespace-nowrap", PRIVATE)}>
                        {formatNumber(t, a.balance)} {a.currency}
                      </span>
                    )}
                  </Label>
                </li>
              );
            })}
            <li className="bg-surface-muted/50 flex min-h-12 items-center justify-between gap-3 px-4 font-medium">
              <span>{t.common.balanceToday}</span>
              <Amount v={total} private />
            </li>
          </ul>
        )}
      </Card>

      {failure && (
        <Alert variant="negative" role="alert">
          <TriangleAlert aria-hidden />
          <span>{failure}</span>
        </Alert>
      )}
      {!failure && preparing && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <span>{t.settings.walletPreparing}</span>
        </Alert>
      )}
      {otherCurrencies.length > 0 && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <span>{t.settings.noConversion(otherCurrencies.map((a) => `${nameOf(a)} (${a.currency})`).join(", "))}</span>
        </Alert>
      )}

      {accounts.length > 0 && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {manualSelection ? (
            <Button variant="ghost" className="-ml-4" disabled={saving} onClick={() => save(null)}>
              {t.settings.resetSelection}
            </Button>
          ) : (
            <p className="text-ink-muted text-sm">{t.settings.automaticSelection}</p>
          )}
          <ActionMessage state={response} />
        </div>
      )}
    </div>
  );
}
