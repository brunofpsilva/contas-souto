// Nomes mostrados na app para valores guardados com outro nome (glossário em
// docs/redesenho-ux.md, secção 5). O que está na base de dados não muda.
import type { Categoria, Estado } from "./dominio";

/** Estado de uma despesa: guardado como "previsto"/"pago", mostrado como "Por pagar"/"Paga". */
export const ROTULO_ESTADO: Record<Estado, string> = { previsto: "Por pagar", pago: "Paga" };

/** Categorias com um nome mais curto no ecrã (o enum da base de dados fica como está). */
const CATEGORIAS_CURTAS: Partial<Record<Categoria, string>> = {
  "Ligações (luz, água, gás, net)": "Ligações",
};

export function rotuloCategoria(categoria: string): string {
  return CATEGORIAS_CURTAS[categoria as Categoria] ?? categoria;
}

// Nomes em português dos tipos de conta do Wallet (accountType).
const TIPOS: Record<string, string> = {
  General: "Geral",
  Cash: "Dinheiro",
  CurrentAccount: "Conta à ordem",
  CreditCard: "Cartão de crédito",
  SavingAccount: "Poupança",
  Bonus: "Bónus",
  Insurance: "Seguro",
  Investment: "Investimento",
  Loan: "Empréstimo",
  Mortgage: "Crédito habitação",
  Overdraft: "Descoberto",
};

export function tipoConta(tipo: string): string {
  return TIPOS[tipo] ?? (tipo || "—");
}
