import { BotaoSair } from "@/components/botao-sair";
import { exigirUtilizador } from "@/lib/auth";

// Página provisória: o dashboard chega no passo 8.
export default async function Home() {
  const eu = await exigirUtilizador();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold">Contas Souto</h1>
        <BotaoSair />
      </div>
      <p className="text-muted-foreground mt-2">Olá, {eu.nome}. Em construção.</p>
    </main>
  );
}
