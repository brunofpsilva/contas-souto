"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";

interface Aviso {
  texto: string;
  /** Ação curta ao lado do texto, por exemplo "Anular". */
  acao?: { texto: string; aoClicar: () => void };
}

const Contexto = createContext<(aviso: Aviso) => void>(() => {});

/** Tempo que o aviso fica à vista (e que há para carregar em "Anular"). */
const DURACAO_MS = 5000;

/**
 * Aviso curto por cima da barra de baixo, que desaparece sozinho. Serve para confirmar o que
 * acabou de acontecer e oferecer "Anular" (marcar uma despesa como paga, por exemplo).
 */
export function ProvedorAvisos({ children }: { children: React.ReactNode }) {
  const [aviso, setAviso] = useState<(Aviso & { id: number }) | null>(null);
  const mostrar = useCallback((a: Aviso) => setAviso({ ...a, id: Date.now() }), []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), DURACAO_MS);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <Contexto value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6"
      >
        {aviso && (
          <div
            key={aviso.id}
            role="status"
            className="bg-texto text-fundo shadow-flutuante animate-in fade-in-0 slide-in-from-bottom-2 pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-2 rounded-lg pl-4 text-sm"
          >
            <span className="min-w-0 flex-1 py-2 wrap-break-word">{aviso.texto}</span>
            {aviso.acao ? (
              <button
                type="button"
                className="h-12 shrink-0 px-4 font-semibold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-current/50"
                onClick={() => {
                  aviso.acao!.aoClicar();
                  setAviso(null);
                }}
              >
                {aviso.acao.texto}
              </button>
            ) : (
              <span className="w-4" />
            )}
          </div>
        )}
      </div>
    </Contexto>
  );
}

export function useAviso() {
  return use(Contexto);
}
