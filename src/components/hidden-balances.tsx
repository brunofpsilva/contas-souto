"use client";

import { Eye, EyeOff } from "lucide-react";
import { createContext, use, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { HIDE_BALANCES_COOKIE, PRIVATE } from "@/lib/privacy";

const Context = createContext<{ hidden: boolean; toggle: () => void } | null>(null);

// With balances hidden: blur the values and hide the chart's axis labels.
const HIDDEN_STYLE = `
.${PRIVATE} { filter: blur(0.45em); user-select: none; }
.private-axis .recharts-yAxis-tick-labels { visibility: hidden; }
`;

/** Wraps the app; with balances hidden, blurs everything with the `private` class. */
export function HiddenBalancesProvider({ initial, children }: { initial: boolean; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(initial);
  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${HIDE_BALANCES_COOKIE}=${next ? "1" : ""}; path=/; max-age=${next ? 60 * 60 * 24 * 365 : 0}; samesite=lax`;
  }
  return (
    <Context value={{ hidden, toggle }}>
      {hidden && <style>{HIDDEN_STYLE}</style>}
      {children}
    </Context>
  );
}

export function HideBalancesButton() {
  const t = useT();
  const c = use(Context);
  if (!c) return null;
  const text = c.hidden ? t.nav.showBalances : t.nav.hideBalances;
  return (
    <Button variant="ghost" size="icon" onClick={c.toggle} aria-pressed={c.hidden} aria-label={text} title={text}>
      {c.hidden ? <EyeOff /> : <Eye />}
    </Button>
  );
}
