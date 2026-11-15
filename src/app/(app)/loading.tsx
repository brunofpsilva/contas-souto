import { getT } from "@/i18n/server";

/** While a screen loads: the shape of the cards, without text. */
export default async function Loading() {
  const t = await getT();
  return (
    <div role="status" aria-label={t.common.loading} className="grid gap-4">
      <div className="bg-surface-muted h-44 animate-pulse rounded-xl" />
      <div className="bg-surface-muted h-5 w-44 animate-pulse rounded-sm" />
      <div className="bg-surface-muted h-60 animate-pulse rounded-xl" />
    </div>
  );
}
