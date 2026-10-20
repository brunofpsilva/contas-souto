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
