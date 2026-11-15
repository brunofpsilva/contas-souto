import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).notFound.title };
}

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-semibold">{t.notFound.heading}</h1>
      <Button asChild className="w-fit">
        <Link href="/">{t.notFound.goHome}</Link>
      </Button>
    </main>
  );
}
