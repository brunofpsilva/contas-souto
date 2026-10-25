// Regras da previsão do dia a dia. Os ids são das categorias do Wallet (iguais em todas
// as contas); os nomes podem mudar no Wallet, os ids não.

export interface RegrasTendencia {
  /** Meses completos usados para salários e gastos mensais. */
  mesesJanela: number;
  /** Grupo de categorias dos rendimentos. */
  grupoRendimentos: string;
  categoriaSalario: string;
  categoriaSubsidio: string;
  categoriaReembolso: string;
  /** Salário mensal fixo (substitui a média dos meses); vazio usa os movimentos. */
  salariosFixos: { nome: string; valor: number }[];
  /** Categorias da renda (mostrada à parte dos outros gastos). */
  categoriasRenda: string[];
  /** Despesas pontuais da casa: não entram na previsão. */
  categoriasExcluidas: string[];
  /** Notas que identificam os rendimentos que se repetem uma vez por ano. */
  notaSubsidioAnual: RegExp;
  notaBonus: RegExp;
  notaIrs: RegExp;
}

/**
 * Salários fixos de SALARIOS_FIXOS, no formato "Nome:valor,Nome:valor" (ex.: "Ana:1500.50,Rui:1200").
 * Ficam fora do código porque o repositório é público. Vazio ou inválido: usa os movimentos.
 */
export function lerSalariosFixos(valor: string | undefined = process.env.SALARIOS_FIXOS): { nome: string; valor: number }[] {
  if (!valor?.trim()) return [];
  const partes = valor.split(",").map((p) => {
    const i = p.lastIndexOf(":");
    const nome = p.slice(0, i).trim();
    const num = Number(p.slice(i + 1).trim());
    return i > 0 && nome && Number.isFinite(num) && num > 0 ? { nome, valor: num } : null;
  });
  if (partes.some((p) => p === null)) {
    console.error("SALARIOS_FIXOS inválido (formato: Nome:valor,Nome:valor). A usar os movimentos do Wallet.");
    return [];
  }
  return partes as { nome: string; valor: number }[];
}

export const REGRAS: RegrasTendencia = {
  mesesJanela: 12,
  grupoRendimentos: "income",
  categoriaSalario: "5c5c2710-0064-8000-8000-000000000000", // Salários
  categoriaSubsidio: "5c5c2711-0064-8000-8000-000000000000", // Subsídios
  categoriaReembolso: "5c5c2718-0064-8000-8000-000000000000", // Reembolsos
  salariosFixos: lerSalariosFixos(),
  categoriasRenda: [
    "5c5c1f43-0050-8000-8000-000000000000", // Renda v2
    "5c5c1f42-0050-8000-8000-000000000000", // Renda
  ],
  categoriasExcluidas: [
    "5c5c0bbd-001e-8000-8000-000000000000", // Casa (grupo Housing): sinal, obras, alterações
  ],
  notaSubsidioAnual: /natal|f[ée]rias/i,
  notaBonus: /b[oó]nus/i,
  notaIrs: /\birs\b/i,
};
