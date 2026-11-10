import { CircleX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { utilizadorAtual } from "@/lib/auth";
import { BotaoGoogle } from "./botao-google";

export const metadata: Metadata = { title: "Entrar" };

// O que aconteceu, sem nomes técnicos. O botão por baixo já serve para tentar de novo.
const SEM_ACESSO = "Este email não tem acesso.";
const COM_GOOGLE = "Não foi possível entrar com o Google.";
const GERAL = "Não foi possível entrar.";
const ERROS: Record<string, string> = {
  AccessDenied: SEM_ACESSO,
  OAuthSignin: COM_GOOGLE,
  OAuthCallback: COM_GOOGLE,
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await utilizadorAtual()) redirect("/");
  const { error } = await searchParams;
  const codigo = Array.isArray(error) ? error[0] : error;
  const mensagem = codigo ? (ERROS[codigo] ?? GERAL) : null;
  // O detalhe (por exemplo "Configuration") fica no log do servidor.
  if (codigo && !ERROS[codigo]) console.error(`[login] ${codigo}`);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Contas Souto</h1>
        <p className="text-texto-suave">Despesas da casa e saldo previsto.</p>
      </div>
      {mensagem && (
        <Alert variant="negativo" role="alert">
          <CircleX aria-hidden />
          <span>{mensagem}</span>
        </Alert>
      )}
      <BotaoGoogle />
    </main>
  );
}
