"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  return (
    <Button variant="ghost" onClick={() => void signOut({ callbackUrl: "/login" })}>
      Sair
    </Button>
  );
}
