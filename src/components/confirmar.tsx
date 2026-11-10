"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Confirmação antes de apagar: o título pergunta com o nome ("Apagar «Sofá»?") e o botão
 * repete a ação ("Apagar despesa"). O filho é o botão que abre o diálogo.
 */
export function Confirmar({
  titulo,
  descricao,
  textoConfirmar,
  aoConfirmar,
  children,
}: {
  titulo: string;
  descricao?: string;
  textoConfirmar: string;
  aoConfirmar: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [aCorrer, iniciar] = useTransition();

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent {...(descricao ? {} : { "aria-describedby": undefined })}>
        <div className="grid gap-1">
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descricao && <AlertDialogDescription>{descricao}</AlertDialogDescription>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={aCorrer}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={aCorrer}
            onClick={() =>
              iniciar(async () => {
                await aoConfirmar();
                setAberto(false);
              })
            }
          >
            {aCorrer ? "A apagar…" : textoConfirmar}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
