"use client"; // Error boundaries have to be client components.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** Unexpected error on a screen: says what happened and lets you try again (the detail stays in the log). */
export default function ScreenError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="grid justify-items-start gap-4 py-8">
      <p className="text-lg font-semibold">{t.common.somethingWrong}</p>
      <Button onClick={() => retry()}>{t.common.tryAgain}</Button>
    </div>
  );
}
