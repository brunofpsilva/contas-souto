"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SegmentosEscolha } from "@/components/segmentos";
import { COOKIE_TEMA, lerTema, type Tema } from "@/lib/tema";

const OPCOES = [
  { valor: "sistema", texto: "Sistema" },
  { valor: "claro", texto: "Claro" },
  { valor: "escuro", texto: "Escuro" },
];

/** Sistema, Claro ou Escuro. Aplica-se ao tocar e fica guardado num cookie durante um ano. */
export function EscolhaTema({ inicial }: { inicial: Tema | null }) {
  const [valor, setValor] = useState<string>(inicial ?? "sistema");
  const router = useRouter();

  function mudar(novo: string) {
    setValor(novo);
    const tema = lerTema(novo);
    document.cookie = `${COOKIE_TEMA}=${tema ?? ""}; path=/; max-age=${tema ? 60 * 60 * 24 * 365 : 0}; samesite=lax`;
    // Muda já as cores; o servidor passa a pôr o mesmo atributo no <html> a partir do cookie.
    if (tema) document.documentElement.dataset.tema = tema;
    else delete document.documentElement.dataset.tema;
    // A cor da barra do browser vem do servidor (generateViewport).
    router.refresh();
  }

  return <SegmentosEscolha nome="tema" rotulo="Tema" esconderRotulo opcoes={OPCOES} valor={valor} aoMudar={mudar} />;
}
