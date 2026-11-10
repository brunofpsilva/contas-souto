import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { CORES, lerTema } from "@/lib/tema";

// Lê os tokens de cor diretamente de globals.css, para o teste acompanhar o que a app usa.
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(seletor: string): Record<string, string> {
  const inicio = css.indexOf(`${seletor} {`);
  if (inicio < 0) throw new Error(`Não encontrei "${seletor}" em globals.css`);
  const bloco = css.slice(inicio, css.indexOf("}", inicio));
  return Object.fromEntries([...bloco.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]));
}

const claro = tokens(":root");
const escuroSistema = tokens(':root:not([data-tema="claro"])');
const escuroEscolhido = tokens(':root[data-tema="escuro"]');

/** Rácio de contraste da WCAG 2.x entre duas cores "#rrggbb". */
function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [primeiro plano, fundo, mínimo]: 4,5 para texto; 3 para contornos de controlos e gráficos.
const PARES: [string, string, number][] = [
  ["texto", "fundo", 4.5],
  ["texto", "superficie", 4.5],
  ["texto", "superficie-suave", 4.5],
  ["texto-suave", "fundo", 4.5],
  ["texto-suave", "superficie", 4.5],
  ["texto-suave", "superficie-suave", 4.5],
  ["primaria", "fundo", 4.5],
  ["primaria", "superficie", 4.5],
  ["primaria", "primaria-suave", 4.5],
  ["sobre-primaria", "primaria", 4.5],
  ["positivo", "fundo", 4.5],
  ["positivo", "superficie", 4.5],
  ["positivo", "positivo-suave", 4.5],
  ["aviso", "fundo", 4.5],
  ["aviso", "superficie", 4.5],
  ["aviso", "aviso-suave", 4.5],
  ["negativo", "fundo", 4.5],
  ["negativo", "superficie", 4.5],
  ["negativo", "negativo-suave", 4.5],
  ["borda-forte", "fundo", 3],
  ["borda-forte", "superficie", 3],
  ["grafico-pago", "superficie", 3],
  ["grafico-pago", "superficie-suave", 3],
  ["grafico-por-pagar", "superficie", 3],
  ["grafico-por-pagar", "superficie-suave", 3],
];

describe("tokens de cor", () => {
  test("os dois temas têm os mesmos tokens", () => {
    expect(Object.keys(claro).length).toBeGreaterThanOrEqual(18);
    expect(Object.keys(escuroEscolhido).sort()).toEqual(Object.keys(claro).sort());
  });

  test("o escuro do sistema e o escuro escolhido são iguais", () => {
    expect(escuroSistema).toEqual(escuroEscolhido);
  });

  describe.each([
    ["claro", claro],
    ["escuro", escuroEscolhido],
  ])("contraste AA no tema %s", (_nome, tema) => {
    test.each(PARES)("%s sobre %s ≥ %s", (frente, fundo, minimo) => {
      expect(contraste(tema[frente], tema[fundo])).toBeGreaterThanOrEqual(minimo);
    });
  });

  test("as cores usadas fora do CSS são as dos tokens", () => {
    for (const [nome, tema] of [["claro", claro], ["escuro", escuroEscolhido]] as const) {
      expect(CORES[nome]).toEqual({ fundo: tema.fundo, primaria: tema.primaria, sobrePrimaria: tema["sobre-primaria"] });
    }
  });
});

describe("lerTema", () => {
  test("só aceita claro e escuro; o resto é o tema do sistema", () => {
    expect(lerTema("claro")).toBe("claro");
    expect(lerTema("escuro")).toBe("escuro");
    expect(lerTema(undefined)).toBeNull();
    expect(lerTema("azul")).toBeNull();
  });
});
