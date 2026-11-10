"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function BotaoSair() {
  return (
    <Button variant="outline" onClick={() => void signOut({ callbackUrl: "/login" })}>
      Sair
    </Button>
  );
}
