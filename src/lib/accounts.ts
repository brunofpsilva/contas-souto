// Which accounts count for the "balance today" (pure function, tested).
// Rule: if nobody has chosen, the accounts with a positive balance count.

export interface BaseAccount {
  id: string;
  balance: number;
}

export type AccountWithSelection<T extends BaseAccount> = T & { included: boolean };

export function markIncluded<T extends BaseAccount>(accounts: readonly T[], selected: readonly string[] | null): AccountWithSelection<T>[] {
  const ids = selected ? new Set(selected) : null;
  return accounts.map((a) => ({ ...a, included: ids ? ids.has(a.id) : a.balance > 0 }));
}

/** Sum of the included accounts' balances; null if no accounts have been synced yet. */
export function computeAvailable(accounts: readonly AccountWithSelection<BaseAccount>[]): number | null {
  if (!accounts.length) return null;
  const total = accounts.filter((a) => a.included).reduce((s, a) => s + a.balance, 0);
  return Math.round(total * 100) / 100;
}
