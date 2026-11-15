import { CircleX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { GoogleButton } from "./google-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).login.title };
}

// What happened, without technical names. The button below already works for trying again.
const ERRORS: Record<string, "noAccess" | "googleFailed"> = {
  AccessDenied: "noAccess",
  OAuthSignin: "googleFailed",
  OAuthCallback: "googleFailed",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await currentUser()) redirect("/");
  const t = await getT();
  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;
  const message = code ? t.login[ERRORS[code] ?? "failed"] : null;
  // The detail (for example "Configuration") stays in the server log.
  if (code && !ERRORS[code]) console.error(`[login] ${code}`);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">{t.app.name}</h1>
        <p className="text-ink-muted">{t.app.description}</p>
      </div>
      {message && (
        <Alert variant="negative" role="alert">
          <CircleX aria-hidden />
          <span>{message}</span>
        </Alert>
      )}
      <GoogleButton />
    </main>
  );
}
