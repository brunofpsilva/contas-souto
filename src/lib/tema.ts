// Tema da app: "Sistema" (sem cookie), "Claro" ou "Escuro". O cookie é lido no servidor e
// posto no <html> (data-tema), por isso a página já chega com as cores certas.

/** Cookie que lembra o tema escolhido nas Definições. */
export const COOKIE_TEMA = "tema";

export const TEMAS = ["claro", "escuro"] as const;
export type Tema = (typeof TEMAS)[number];

/** Valor do cookie; qualquer outra coisa é "Sistema" (null). */
export function lerTema(valor: string | undefined): Tema | null {
  return TEMAS.find((t) => t === valor) ?? null;
}

/**
 * As cores usadas fora do CSS (barra do browser, manifest e ícone). São as mesmas de
 * src/app/globals.css; test/tema.test.ts confirma que não se desencontram.
 */
export const CORES: Record<Tema, { fundo: string; primaria: string; sobrePrimaria: string }> = {
  claro: { fundo: "#f6f4f0", primaria: "#1d5873", sobrePrimaria: "#ffffff" },
  escuro: { fundo: "#141310", primaria: "#7cc4e0", sobrePrimaria: "#0b2530" },
};
