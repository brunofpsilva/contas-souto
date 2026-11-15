import { cookies } from "next/headers";
import { HiddenBalancesProvider } from "@/components/hidden-balances";
import { BottomNav, DesktopTitle, Header } from "@/components/navigation";
import { ToastProvider } from "@/components/toasts";
import { requireUser } from "@/lib/auth";
import { HIDE_BALANCES_COOKIE } from "@/lib/privacy";
import { SIDES } from "@/lib/routes";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [, jar] = await Promise.all([requireUser(), cookies()]);
  return (
    <HiddenBalancesProvider initial={jar.get(HIDE_BALANCES_COOKIE)?.value === "1"}>
      <ToastProvider>
        <Header />
        {/* On phones, the bottom leaves room for the fixed navigation bar. */}
        <main
          className={`mx-auto grid w-full max-w-5xl content-start gap-6 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-6 md:pb-16 ${SIDES}`}
        >
          <DesktopTitle />
          {children}
        </main>
        <BottomNav />
      </ToastProvider>
    </HiddenBalancesProvider>
  );
}
