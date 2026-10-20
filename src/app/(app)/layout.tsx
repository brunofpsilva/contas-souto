import { BotaoSair } from "@/components/botao-sair";
import { Navegacao } from "@/components/navegacao";
import { exigirUtilizador } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const eu = await exigirUtilizador();
  return (
    <>
      <header className="bg-background/90 sticky top-0 z-10 border-b backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-x-6 gap-y-1 px-4 py-2 max-sm:flex-wrap">
          <span className="font-heading text-lg font-bold tracking-tight">Contas Souto</span>
          <Navegacao />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground text-sm max-sm:hidden">{eu.nome.split(" ")[0]}</span>
            <BotaoSair />
          </div>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 pt-6 pb-16">{children}</main>
    </>
  );
}
