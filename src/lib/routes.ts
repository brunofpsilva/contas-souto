// The app's screens: title, the tab they belong to and, for sub-pages, where the back arrow goes.
// It lives outside the client components so the server can use it too.
import type { Messages } from "@/i18n/config";

/** Keys of `t.nav` that are plain texts (screen and tab names). */
type NavText = { [K in keyof Messages["nav"]]: Messages["nav"][K] extends string ? K : never }[keyof Messages["nav"]];

/** The four navigation tabs, in the order they appear. */
export const TABS = [
  { href: "/", label: "home" },
  { href: "/expenses", label: "expenses" },
  { href: "/forecast", label: "forecast" },
  { href: "/budget", label: "budget" },
] as const satisfies readonly { href: string; label: NavText }[];

export type Tab = (typeof TABS)[number]["href"];

export interface Route {
  /** Screen title (1 or 2 words), a key of `t.nav`. */
  title: NavText;
  /** Tab that is marked in the navigation. */
  tab: Tab | null;
  /** Only on sub-pages: where the arrow at the top goes back to. No bottom bar. */
  parent?: string;
  /** Explanation shown in the "(i)" next to the title. */
  help?: "month" | "budget";
}

const ROUTES: [RegExp, Route][] = [
  [/^\/$/, { title: "home", tab: "/" }],
  [/^\/expenses$/, { title: "expenses", tab: "/expenses" }],
  [/^\/expenses\/new$/, { title: "newExpense", tab: "/expenses", parent: "/expenses" }],
  [/^\/expenses\/[^/]+\/edit$/, { title: "editExpense", tab: "/expenses", parent: "/expenses" }],
  [/^\/forecast$/, { title: "forecast", tab: "/forecast", help: "month" }],
  [/^\/forecast\/spending$/, { title: "monthlySpending", tab: "/forecast", parent: "/forecast" }],
  [/^\/budget$/, { title: "budget", tab: "/budget", help: "budget" }],
  [/^\/budget\/edit$/, { title: "editRooms", tab: "/budget", parent: "/budget" }],
  [/^\/settings$/, { title: "settings", tab: null }],
];

/** Route of a path; unknown paths get the app's name as the title (null). */
export function routeOf(path: string): Route | (Omit<Route, "title"> & { title: null }) {
  return ROUTES.find(([test]) => test.test(path))?.[1] ?? { title: null, tab: null };
}

/** Address for adding an expense; with a room, it comes already chosen in the form. */
export function newExpenseHref(room?: string | null): string {
  return room && /^\d{1,9}$/.test(room) ? `/expenses/new?room=${room}` : "/expenses/new";
}

/**
 * Side margins of the screens: 16 px (24 from md), never less than the notch asks for with
 * the phone held sideways.
 */
export const SIDES =
  "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]";
