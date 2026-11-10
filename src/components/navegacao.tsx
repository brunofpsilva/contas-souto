"use client";

import { ChevronLeft, House, PiggyBank, Plus, ReceiptText, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Ajuda } from "@/components/ajuda";
import { BotaoSaldoOculto } from "@/components/saldo-oculto";
import { Button } from "@/components/ui/button";
import { cicloDe, fimCiclo, inicioCiclo } from "@/lib/ciclo";
import { dataCurta } from "@/lib/escritura";
import { maiuscula } from "@/lib/formato";
import { mesLongo } from "@/lib/meses";
import { hrefNovaDespesa, LADOS, rotaDe, SEPARADORES, type Rota, type Separador } from "@/lib/rotas";
import { cn } from "@/lib/utils";

const ICONES: Record<Separador, typeof House> = {
  "/": House,
  "/despesas": ReceiptText,
  "/previsao": TrendingUp,
  "/orcamento": PiggyBank,
};

const FOCO = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Cabeçalho fixo. No telemóvel mostra o título do ecrã (e a seta, nas sub-páginas); a partir
 * de md mostra o nome da app, os separadores e o botão para adicionar uma despesa.
 */
export function Cabecalho() {
  const caminho = usePathname();
  const rota = rotaDe(caminho);
  return (
    <header className="bg-fundo/90 supports-backdrop-filter:bg-fundo/75 sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className={cn("mx-auto flex h-14 w-full max-w-5xl items-center gap-1", LADOS)}>
        <div className="flex min-w-0 flex-1 items-center md:hidden">
          <Titulo rota={rota} className="text-lg" />
        </div>

        <span className="text-lg font-semibold max-md:hidden">Contas Souto</span>
        <nav aria-label="Principal" className="ml-4 flex flex-1 gap-1 max-md:hidden">
          {SEPARADORES.map((s) => {
            const ativo = rota.separador === s.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-lg px-3.5 text-sm font-medium transition-colors",
                  FOCO,
                  ativo ? "bg-superficie-suave text-texto" : "text-texto-suave hover:text-texto",
                )}
              >
                {s.texto}
              </Link>
            );
          })}
        </nav>
        <Button asChild className="mr-1 max-md:hidden">
          <LigacaoNovaDespesa>
            <Plus aria-hidden />
            Adicionar despesa
          </LigacaoNovaDespesa>
        </Button>

        <BotaoSaldoOculto />
        <Link
          href="/definicoes"
          aria-label="Definições"
          aria-current={caminho === "/definicoes" ? "page" : undefined}
          className={cn(
            "-mr-2.5 flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
            FOCO,
            caminho === "/definicoes" ? "text-primaria" : "text-texto hover:bg-superficie-suave",
          )}
        >
          <Settings className="size-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

/** Título do ecrã no topo do conteúdo, só a partir de md (no telemóvel está no cabeçalho). */
export function TituloDesktop() {
  const rota = rotaDe(usePathname());
  return (
    <div className="flex items-center max-md:hidden">
      <Titulo rota={rota} className="text-2xl" />
    </div>
  );
}

function Titulo({ rota, className }: { rota: Rota; className?: string }) {
  return (
    <>
      {rota.pai && (
        <Link href={rota.pai} aria-label="Voltar" className={cn("-ml-3 flex size-11 shrink-0 items-center justify-center rounded-lg", FOCO)}>
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
      )}
      <h1 className={cn("truncate font-semibold", className)}>{rota.titulo}</h1>
      {rota.ajuda === "mes" && (
        <Ajuda rotulo="O que conta como um mês">
          <TextoMes />
        </Ajuda>
      )}
      {rota.ajuda === "orcamento" && <Ajuda rotulo="Como funciona o orçamento">Conta o que está pago e por pagar. Não entra na previsão.</Ajuda>}
    </>
  );
}

/** Explica uma vez que o mês vai de salário a salário, com as datas do mês em curso. */
function TextoMes() {
  const mes = cicloDe(new Date());
  return (
    <>
      Cada mês vai de salário a salário. {maiuscula(mesLongo(mes))}: de {dataCurta(inicioCiclo(mes))} a {dataCurta(fimCiclo(mes))}.
    </>
  );
}

/** Barra fixa em baixo no telemóvel, ao alcance do polegar, com o "+" ao centro. */
export function NavegacaoFundo() {
  const rota = rotaDe(usePathname());
  // Nas sub-páginas (formulários), os botões do formulário ocupam o lugar da barra.
  if (rota.pai) return null;
  const [inicio, despesas, previsao, orcamento] = SEPARADORES;
  return (
    <nav
      aria-label="Principal"
      className="bg-superficie/95 supports-backdrop-filter:bg-superficie/85 fixed inset-x-0 bottom-0 z-20 border-t pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 px-1">
        <ItemSeparador s={inicio} ativo={rota.separador === inicio.href} />
        <ItemSeparador s={despesas} ativo={rota.separador === despesas.href} />
        <li>
          <LigacaoNovaDespesa aria-label="Adicionar despesa" className={cn("group flex h-16 items-center justify-center", "outline-none")}>
            <span className="bg-primaria text-sobre-primaria group-focus-visible:ring-ring/50 flex size-12 items-center justify-center rounded-full group-focus-visible:ring-3">
              <Plus className="size-6" aria-hidden />
            </span>
          </LigacaoNovaDespesa>
        </li>
        <ItemSeparador s={previsao} ativo={rota.separador === previsao.href} />
        <ItemSeparador s={orcamento} ativo={rota.separador === orcamento.href} />
      </ul>
    </nav>
  );
}

function ItemSeparador({ s, ativo }: { s: (typeof SEPARADORES)[number]; ativo: boolean }) {
  const Icone = ICONES[s.href];
  return (
    <li>
      <Link
        href={s.href}
        aria-current={ativo ? "page" : undefined}
        className={cn(
          "group flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors outline-none",
          ativo ? "text-texto" : "text-texto-suave",
        )}
      >
        <span
          className={cn(
            "group-focus-visible:ring-ring/50 flex h-7 w-12 items-center justify-center rounded-full transition-colors group-focus-visible:ring-3",
            ativo && "bg-primaria-suave text-primaria",
          )}
        >
          <Icone className="size-5" strokeWidth={ativo ? 2.25 : 1.75} aria-hidden />
        </span>
        {s.texto}
      </Link>
    </li>
  );
}

type PropsLigacao = Omit<React.ComponentProps<typeof Link>, "href">;

/**
 * Ligação para "Nova despesa". Na lista filtrada por divisão (/despesas?divisao=ID), a
 * divisão vai já escolhida. Ler os parâmetros do endereço pede uma fronteira de Suspense.
 */
function LigacaoNovaDespesa(props: PropsLigacao) {
  return (
    <Suspense fallback={<Link href={hrefNovaDespesa()} {...props} />}>
      <LigacaoComDivisao {...props} />
    </Suspense>
  );
}

function LigacaoComDivisao(props: PropsLigacao) {
  const caminho = usePathname();
  const divisao = useSearchParams().get("divisao");
  return <Link href={hrefNovaDespesa(caminho === "/despesas" ? divisao : null)} {...props} />;
}
