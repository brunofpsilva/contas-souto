import { cookies } from "next/headers";
import { ProvedorAvisos } from "@/components/avisos";
import { Cabecalho, NavegacaoFundo, TituloDesktop } from "@/components/navegacao";
import { ProvedorSaldoOculto } from "@/components/saldo-oculto";
import { exigirUtilizador } from "@/lib/auth";
import { COOKIE_SALDO_OCULTO } from "@/lib/privacidade";
import { LADOS } from "@/lib/rotas";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [, biscoitos] = await Promise.all([exigirUtilizador(), cookies()]);
  return (
    <ProvedorSaldoOculto inicial={biscoitos.get(COOKIE_SALDO_OCULTO)?.value === "1"}>
      <ProvedorAvisos>
        <Cabecalho />
        {/* No telemóvel, o fundo deixa espaço para a barra de navegação fixa. */}
        <main
          className={`mx-auto grid w-full max-w-5xl content-start gap-6 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-6 md:pb-16 ${LADOS}`}
        >
          <TituloDesktop />
          {children}
        </main>
        <NavegacaoFundo />
      </ProvedorAvisos>
    </ProvedorSaldoOculto>
  );
}
