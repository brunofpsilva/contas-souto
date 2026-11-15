"use client";

import { ChevronLeft, House, PiggyBank, Plus, ReceiptText, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HelpPopover } from "@/components/help-popover";
import { HideBalancesButton } from "@/components/hidden-balances";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cycleEnd, cycleOf, cycleStart } from "@/lib/cycle";
import { capitalize, longMonth, shortDate } from "@/lib/format";
import { newExpenseHref, routeOf, SIDES, TABS, type Tab } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ICONS: Record<Tab, typeof House> = {
  "/": House,
  "/expenses": ReceiptText,
  "/forecast": TrendingUp,
  "/budget": PiggyBank,
};

const FOCUS = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Fixed header. On phones it shows the screen title (and the arrow, on sub-pages); from md up it
 * shows the app name, the tabs and the button to add an expense.
 */
export function Header() {
  const t = useT();
  const path = usePathname();
  const route = routeOf(path);
  return (
    <header className="bg-canvas/90 supports-backdrop-filter:bg-canvas/75 sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className={cn("mx-auto flex h-14 w-full max-w-5xl items-center gap-1", SIDES)}>
        <div className="flex min-w-0 flex-1 items-center md:hidden">
          <Title route={route} className="text-lg" />
        </div>

        <span className="text-lg font-semibold max-md:hidden">{t.app.name}</span>
        <nav aria-label={t.nav.main} className="ml-4 flex flex-1 gap-1 max-md:hidden">
          {TABS.map((tab) => {
            const active = route.tab === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-lg px-3.5 text-sm font-medium transition-colors",
                  FOCUS,
                  active ? "bg-surface-muted text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {t.nav[tab.label]}
              </Link>
            );
          })}
        </nav>
        <Button asChild className="mr-1 max-md:hidden">
          <NewExpenseLink>
            <Plus aria-hidden />
            {t.common.addExpense}
          </NewExpenseLink>
        </Button>

        <HideBalancesButton />
        <Link
          href="/settings"
          aria-label={t.nav.settings}
          aria-current={path === "/settings" ? "page" : undefined}
          className={cn(
            "-mr-2.5 flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
            FOCUS,
            path === "/settings" ? "text-brand" : "text-ink hover:bg-surface-muted",
          )}
        >
          <Settings className="size-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

/** Screen title at the top of the content, only from md up (on phones it is in the header). */
export function DesktopTitle() {
  const route = routeOf(usePathname());
  return (
    <div className="flex items-center max-md:hidden">
      <Title route={route} className="text-2xl" />
    </div>
  );
}

function Title({ route, className }: { route: ReturnType<typeof routeOf>; className?: string }) {
  const t = useT();
  return (
    <>
      {route.parent && (
        <Link href={route.parent} aria-label={t.common.back} className={cn("-ml-3 flex size-11 shrink-0 items-center justify-center rounded-lg", FOCUS)}>
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
      )}
      <h1 className={cn("truncate font-semibold", className)}>{route.title ? t.nav[route.title] : t.app.name}</h1>
      {route.help === "month" && (
        <HelpPopover label={t.nav.monthHelpLabel}>
          <MonthHelp />
        </HelpPopover>
      )}
      {route.help === "budget" && <HelpPopover label={t.nav.budgetHelpLabel}>{t.nav.budgetHelp}</HelpPopover>}
    </>
  );
}

/** Explains once that a month runs from payday to payday, with the dates of the current month. */
function MonthHelp() {
  const t = useT();
  const month = cycleOf(new Date());
  return <>{t.nav.monthHelp(capitalize(longMonth(t, month)), shortDate(t, cycleStart(month)), shortDate(t, cycleEnd(month)))}</>;
}

/** Bar fixed at the bottom on phones, within thumb reach, with the "+" in the middle. */
export function BottomNav() {
  const t = useT();
  const route = routeOf(usePathname());
  // On sub-pages (forms), the form's buttons take the bar's place.
  if (route.parent) return null;
  const [home, expenses, forecast, budget] = TABS;
  return (
    <nav
      aria-label={t.nav.main}
      className="bg-surface/95 supports-backdrop-filter:bg-surface/85 fixed inset-x-0 bottom-0 z-20 border-t pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 px-1">
        <TabItem tab={home} active={route.tab === home.href} />
        <TabItem tab={expenses} active={route.tab === expenses.href} />
        <li>
          <NewExpenseLink aria-label={t.common.addExpense} className="group flex h-16 items-center justify-center outline-none">
            <span className="bg-brand text-on-brand group-focus-visible:ring-ring/50 flex size-12 items-center justify-center rounded-full group-focus-visible:ring-3">
              <Plus className="size-6" aria-hidden />
            </span>
          </NewExpenseLink>
        </li>
        <TabItem tab={forecast} active={route.tab === forecast.href} />
        <TabItem tab={budget} active={route.tab === budget.href} />
      </ul>
    </nav>
  );
}

function TabItem({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  const t = useT();
  const Icon = ICONS[tab.href];
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors outline-none",
          active ? "text-ink" : "text-ink-muted",
        )}
      >
        <span
          className={cn(
            "group-focus-visible:ring-ring/50 flex h-7 w-12 items-center justify-center rounded-full transition-colors group-focus-visible:ring-3",
            active && "bg-brand-muted text-brand",
          )}
        >
          <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        </span>
        {t.nav[tab.label]}
      </Link>
    </li>
  );
}

type LinkProps = Omit<React.ComponentProps<typeof Link>, "href">;

/**
 * Link to "New expense". In the list filtered by room (/expenses?room=ID), the room comes
 * already chosen. Reading the address parameters needs a Suspense boundary.
 */
function NewExpenseLink(props: LinkProps) {
  return (
    <Suspense fallback={<Link href={newExpenseHref()} {...props} />}>
      <LinkWithRoom {...props} />
    </Suspense>
  );
}

function LinkWithRoom(props: LinkProps) {
  const path = usePathname();
  const room = useSearchParams().get("room");
  return <Link href={newExpenseHref(path === "/expenses" ? room : null)} {...props} />;
}
