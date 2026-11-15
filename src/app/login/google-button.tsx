"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function GoogleButton() {
  const t = useT();
  const [signingIn, setSigningIn] = useState(false);
  return (
    <Button
      size="lg"
      className="w-full"
      disabled={signingIn}
      onClick={() => {
        setSigningIn(true);
        void signIn("google", { callbackUrl: "/" });
      }}
    >
      {signingIn ? t.login.opening : t.login.withGoogle}
    </Button>
  );
}
