import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-semibold">Página não encontrada.</h1>
      <Button asChild className="w-fit">
        <Link href="/">Ir para o Início</Link>
      </Button>
    </main>
  );
}
