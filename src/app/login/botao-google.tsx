"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BotaoGoogle() {
  const [aEntrar, setAEntrar] = useState(false);
  return (
    <Button
      size="lg"
      className="h-11 w-full"
      disabled={aEntrar}
      onClick={() => {
        setAEntrar(true);
        void signIn("google", { callbackUrl: "/" });
      }}
    >
      {aEntrar ? "A abrir o Google…" : "Entrar com Google"}
    </Button>
  );
}
