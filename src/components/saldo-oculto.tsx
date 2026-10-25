"use client";

import { Eye, EyeOff } from "lucide-react";
import { createContext, use, useState } from "react";
import { Button } from "@/components/ui/button";
import { COOKIE_SALDO_OCULTO, PRIVADO } from "@/lib/privacidade";

const Contexto = createContext<{ oculto: boolean; alternar: () => void } | null>(null);

// Com os saldos escondidos: desfoca os valores e esconde as marcas do eixo do gráfico.
const ESTILO_OCULTO = `
.${PRIVADO} { filter: blur(0.45em); user-select: none; }
.privado-eixo .recharts-yAxis .recharts-cartesian-axis-tick-value { visibility: hidden; }
`;

/** Envolve a app; com os saldos escondidos, desfoca tudo o que tem a classe `privado`. */
export function ProvedorSaldoOculto({ inicial, children }: { inicial: boolean; children: React.ReactNode }) {
  const [oculto, setOculto] = useState(inicial);
  function alternar() {
    const novo = !oculto;
    setOculto(novo);
    document.cookie = `${COOKIE_SALDO_OCULTO}=${novo ? "1" : ""}; path=/; max-age=${novo ? 60 * 60 * 24 * 365 : 0}; samesite=lax`;
  }
  return (
    <Contexto value={{ oculto, alternar }}>
      {oculto && <style>{ESTILO_OCULTO}</style>}
      {children}
    </Contexto>
  );
}

export function BotaoSaldoOculto() {
  const c = use(Contexto);
  if (!c) return null;
  const texto = c.oculto ? "Mostrar saldos" : "Esconder saldos";
  return (
    <Button variant="ghost" size="icon" onClick={c.alternar} aria-pressed={c.oculto} aria-label={texto} title={texto}>
      {c.oculto ? <EyeOff /> : <Eye />}
    </Button>
  );
}
