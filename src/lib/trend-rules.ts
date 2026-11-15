// Rules for the day-to-day forecast. The ids are Wallet category ids (the same in every
// account); names can change in Wallet, ids can't.

export interface FixedSalary {
  name: string;
  amount: number;
}

export interface TrendRules {
  /** Full months used for salaries and monthly spending. */
  windowMonths: number;
  /** Category group of income. */
  incomeGroup: string;
  salaryCategory: string;
  allowanceCategory: string;
  refundCategory: string;
  /** Fixed monthly salary (replaces the months' figures); empty uses the transactions. */
  fixedSalaries: FixedSalary[];
  /** Rent categories (shown apart from other spending). */
  rentCategories: string[];
  /** One-off house expenses: not part of the forecast. */
  excludedCategories: string[];
  /** Notes that identify income that repeats once a year. */
  annualAllowanceNote: RegExp;
  bonusNote: RegExp;
  taxRefundNote: RegExp;
}

/**
 * Fixed salaries from FIXED_SALARIES, as "Name:amount,Name:amount" (e.g. "Ana:1500.50,Rui:1200").
 * They live outside the code because the repository is public. Empty or invalid: use the transactions.
 * SALARIOS_FIXOS is the old name of the variable and still works.
 */
export function parseFixedSalaries(value: string | undefined = process.env.FIXED_SALARIES ?? process.env.SALARIOS_FIXOS): FixedSalary[] {
  if (!value?.trim()) return [];
  const parts = value.split(",").map((p) => {
    const i = p.lastIndexOf(":");
    const name = p.slice(0, i).trim();
    const amount = Number(p.slice(i + 1).trim());
    return i > 0 && name && Number.isFinite(amount) && amount > 0 ? { name, amount } : null;
  });
  if (parts.some((p) => p === null)) {
    console.error("Invalid FIXED_SALARIES (format: Name:amount,Name:amount). Using the Wallet transactions.");
    return [];
  }
  return parts as FixedSalary[];
}

export const RULES: TrendRules = {
  windowMonths: 12,
  incomeGroup: "income",
  salaryCategory: "5c5c2710-0064-8000-8000-000000000000", // Salaries
  allowanceCategory: "5c5c2711-0064-8000-8000-000000000000", // Allowances
  refundCategory: "5c5c2718-0064-8000-8000-000000000000", // Refunds
  fixedSalaries: parseFixedSalaries(),
  rentCategories: [
    "5c5c1f43-0050-8000-8000-000000000000", // Rent v2
    "5c5c1f42-0050-8000-8000-000000000000", // Rent
  ],
  excludedCategories: [
    "5c5c0bbd-001e-8000-8000-000000000000", // House (Housing group): deposit, works, alterations
  ],
  annualAllowanceNote: /natal|f[ée]rias/i,
  bonusNote: /b[oó]nus/i,
  taxRefundNote: /\birs\b/i,
};
