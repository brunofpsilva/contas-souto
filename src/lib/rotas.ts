// Os ecrãs da app: título, separador a que pertencem e, nas sub-páginas, para onde a seta volta.
// Fica fora dos componentes de cliente para o servidor também o poder usar.

/** Os quatro separadores da navegação, pela ordem em que aparecem. */
export const SEPARADORES = [
  { href: "/", texto: "Início" },
  { href: "/despesas", texto: "Despesas" },
  { href: "/previsao", texto: "Previsão" },
  { href: "/orcamento", texto: "Orçamento" },
] as const;

export type Separador = (typeof SEPARADORES)[number]["href"];

export interface Rota {
  /** Título do ecrã (1 ou 2 palavras). */
  titulo: string;
  /** Separador que fica marcado na navegação. */
  separador: Separador | null;
  /** Só nas sub-páginas: para onde a seta do topo volta. Sem barra de baixo. */
  pai?: string;
  /** Explicação que aparece no "(i)" ao lado do título. */
  ajuda?: "mes" | "orcamento";
}

const ROTAS: [RegExp, Rota][] = [
  [/^\/$/, { titulo: "Início", separador: "/" }],
  [/^\/despesas$/, { titulo: "Despesas", separador: "/despesas" }],
  [/^\/despesas\/nova$/, { titulo: "Nova despesa", separador: "/despesas", pai: "/despesas" }],
  [/^\/despesas\/[^/]+\/editar$/, { titulo: "Editar despesa", separador: "/despesas", pai: "/despesas" }],
  [/^\/previsao$/, { titulo: "Previsão", separador: "/previsao", ajuda: "mes" }],
  [/^\/previsao\/gastos$/, { titulo: "Gastos mensais", separador: "/previsao", pai: "/previsao" }],
  [/^\/orcamento$/, { titulo: "Orçamento", separador: "/orcamento", ajuda: "orcamento" }],
  [/^\/orcamento\/editar$/, { titulo: "Editar divisões", separador: "/orcamento", pai: "/orcamento" }],
  [/^\/definicoes$/, { titulo: "Definições", separador: null }],
];

export function rotaDe(caminho: string): Rota {
  return ROTAS.find(([teste]) => teste.test(caminho))?.[1] ?? { titulo: "Contas Souto", separador: null };
}

/** Endereço para adicionar uma despesa; com uma divisão, já vem escolhida no formulário. */
export function hrefNovaDespesa(divisao?: string | null): string {
  return divisao && /^\d{1,9}$/.test(divisao) ? `/despesas/nova?divisao=${divisao}` : "/despesas/nova";
}

/**
 * Margens laterais dos ecrãs: 16 px (24 a partir de md), nunca menos do que o notch pede
 * com o telemóvel deitado.
 */
export const LADOS =
  "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]";
