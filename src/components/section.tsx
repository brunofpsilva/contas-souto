import { cn } from "@/lib/utils";

/** Section of a screen: short title (3 words at most), with an optional action on the right. */
export function Section({
  id,
  title,
  action,
  className,
  children,
}: {
  /** Also used for the heading's id; without it the id comes from the title. */
  id?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  // Without accents, so the id stays readable ("Sessão" -> "title-sessao").
  const titleId = `title-${id ?? title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section id={id} aria-labelledby={titleId} className={cn("grid content-start gap-2", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
