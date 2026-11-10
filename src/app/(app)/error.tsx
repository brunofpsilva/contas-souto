"use client"; // As fronteiras de erro têm de ser componentes de cliente.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Erro inesperado num ecrã: diz o que se passou e deixa tentar de novo (o detalhe fica no log). */
export default function Erro({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="grid justify-items-start gap-4 py-8">
      <p className="text-lg font-semibold">Algo correu mal.</p>
      <Button onClick={() => retry()}>Tentar de novo</Button>
    </div>
  );
}
