import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { utilizadorAtual } from "@/lib/auth";
import { BotaoGoogle } from "./botao-google";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  AccessDenied: "Este email não tem acesso à Contas Souto. Entra com o email do Rui ou da Ana.",
  OAuthSignin: "Não foi possível começar o login com o Google. Tenta de novo.",
  OAuthCallback: "O Google não confirmou o login. Tenta de novo.",
  Callback: "Houve um problema a guardar o login. Tenta de novo.",
  Configuration: "O login não está bem configurado no servidor.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await utilizadorAtual()) redirect("/");
  const { error } = await searchParams;
  const codigo = Array.isArray(error) ? error[0] : error;
  const mensagem = codigo ? (ERROS[codigo] ?? "Não foi possível entrar. Tenta de novo.") : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Casa no Souto</p>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Contas Souto</h1>
        <p className="text-muted-foreground">Previsão das despesas da casa contra o dinheiro nas contas do Wallet.</p>
      </div>
      {mensagem && (
        <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {mensagem}
        </p>
      )}
      <BotaoGoogle />
    </main>
  );
}
