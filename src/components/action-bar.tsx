import { cn } from "@/lib/utils";

/**
 * The buttons of a sub-page form. On phones they are fixed at the bottom, in place of the
 * navigation bar and within thumb reach; from md up they sit at the end of the form.
 * The form has to leave room at the bottom so it isn't covered (max-md:pb-*).
 */
export function ActionBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "bg-canvas/95 supports-backdrop-filter:bg-canvas/85 fixed inset-x-0 bottom-0 z-20 grid gap-2 border-t pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur",
        "md:static md:z-auto md:flex md:flex-wrap md:items-center md:gap-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
