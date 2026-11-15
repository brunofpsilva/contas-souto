"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";

interface Toast {
  text: string;
  /** Short action next to the text, for example "Undo". */
  action?: { text: string; onClick: () => void };
}

const Context = createContext<(toast: Toast) => void>(() => {});

/** How long the toast stays visible (and how long there is to tap "Undo"). */
const DURATION_MS = 5000;

/**
 * Short message above the bottom bar that goes away on its own. Confirms what just happened and
 * offers "Undo" (marking an expense as paid, for example).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null);
  const show = useCallback((t: Toast) => setToast({ ...t, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <Context value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="bg-ink text-canvas shadow-floating animate-in fade-in-0 slide-in-from-bottom-2 pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-2 rounded-lg pl-4 text-sm"
          >
            <span className="min-w-0 flex-1 py-2 wrap-break-word">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="h-12 shrink-0 px-4 font-semibold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-current/50"
                onClick={() => {
                  toast.action!.onClick();
                  setToast(null);
                }}
              >
                {toast.action.text}
              </button>
            ) : (
              <span className="w-4" />
            )}
          </div>
        )}
      </div>
    </Context>
  );
}

export function useToast() {
  return use(Context);
}
