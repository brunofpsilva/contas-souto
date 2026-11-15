import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Section } from "@/components/section";
import { SignOutButton } from "@/components/sign-out-button";
import { Card } from "@/components/ui/card";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getAccounts, getMilestoneDates, listExpenses } from "@/lib/data";
import { milestoneOf } from "@/lib/forecast";
import { formatDateTime } from "@/lib/format";
import type { Milestone } from "@/lib/milestones";
import { syncStatus } from "@/lib/sync";
import { syncErrorMessage } from "@/lib/sync-messages";
import { readTheme, THEME_COOKIE } from "@/lib/theme";
import { DatesForm, type MilestoneData } from "./dates-form";
import { LanguagePicker } from "./language-picker";
import { ThemePicker } from "./theme-picker";
import { WalletAccounts } from "./wallet-accounts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.settings };
}

export default async function SettingsPage() {
  const [me, t, locale, data, status, dates, expenses, jar] = await Promise.all([
    requireUser(),
    getT(),
    getLocale(),
    getAccounts(),
    syncStatus(),
    getMilestoneDates(),
    listExpenses(),
    cookies(),
  ]);

  const ofMilestone = (kind: Milestone, date: string | null): MilestoneData => {
    const list = expenses.filter((e) => milestoneOf(e) === kind);
    return { date, expenseCount: list.length, total: Math.round(list.reduce((s, e) => s + e.amount, 0) * 100) / 100 };
  };

  const last = status.lastOk;
  const error = status.lastError;

  return (
    // On phones, one column in code order. From md up, the accounts sit on the right.
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <Section id="dates" title={t.settings.datesAndReserve}>
        <DatesForm
          milestones={{ deed: ofMilestone("deed", dates.deedDate), construction: ofMilestone("construction", dates.constructionEndDate) }}
          reserve={data.reserve}
        />
      </Section>

      <Section id="accounts" title={t.settings.walletAccounts} className="md:row-span-4">
        <WalletAccounts
          accounts={data.accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, currency: a.currency, included: a.included }))}
          manualSelection={data.manualSelection}
          updated={last ? t.common.updated(formatDateTime(t, last.finishedAt ?? last.startedAt)) : null}
          failure={error ? t.settings.lastUpdateFailed(formatDateTime(t, error.startedAt), syncErrorMessage(t, error.errorCode)) : null}
          preparing={Boolean(last?.walletSyncing)}
        />
      </Section>

      <Section id="theme" title={t.settings.theme}>
        <ThemePicker initial={readTheme(jar.get(THEME_COOKIE)?.value)} />
      </Section>

      <Section id="language" title={t.settings.language}>
        <LanguagePicker initial={locale} />
      </Section>

      <Section id="session" title={t.settings.session}>
        <Card className="flex min-h-14 items-center justify-between gap-3 py-1.5 pr-1.5 pl-4">
          <span className="min-w-0 truncate">{me.name}</span>
          <SignOutButton />
        </Card>
      </Section>
    </div>
  );
}
