import { cookies } from "next/headers";
import { BotaoSair } from "@/components/botao-sair";
import { Navegacao, NavegacaoFundo } from "@/components/navegacao";
import { BotaoSaldoOculto, ProvedorSaldoOculto } from "@/components/saldo-oculto";
import { exigirUtilizador } from "@/lib/auth";
import { COOKIE_SALDO_OCULTO } from "@/lib/privacidade";

// Margens laterais que respeitam o notch com o telemóvel deitado.
const LADOS = "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [eu, biscoitos] = await Promise.all([exigirUtilizador(), cookies()]);
  return (
    <ProvedorSaldoOculto inicial={biscoitos.get(COOKIE_SALDO_OCULTO)?.value === "1"}>
      <header className="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className={`mx-auto flex h-14 w-full max-w-5xl items-center gap-x-6 ${LADOS}`}>
          <span className="font-heading text-lg font-bold tracking-tight">Contas Souto</span>
          <Navegacao className="max-md:hidden" />
          <div className="ml-auto flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-sm max-md:hidden">{eu.nome.split(" ")[0]}</span>
            <BotaoSaldoOculto />
            <BotaoSair />
          </div>
        </div>
      </header>
      {/* No telemóvel, o fundo deixa espaço para a barra de navegação fixa. */}
      <main
        className={`mx-auto grid w-full max-w-5xl gap-8 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-8 md:pb-16 ${LADOS}`}
      >
        {children}
      </main>
      <NavegacaoFundo className="md:hidden" />
    </ProvedorSaldoOculto>
  );
}
