"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function SignOutButton() {
  const t = useT();
  return (
    <Button variant="outline" onClick={() => void signOut({ callbackUrl: "/login" })}>
      {t.settings.signOut}
    </Button>
  );
}
