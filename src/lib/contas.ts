// Que contas contam para o "disponível hoje" (função pura, testada).
// Regra: se ninguém escolheu, contam as contas com saldo positivo.

export interface ContaBase {
  id: string;
  saldo: number;
}

export type ContaComSelecao<T extends ContaBase> = T & { incluida: boolean };

export function marcarIncluidas<T extends ContaBase>(
  contas: readonly T[],
  escolhidas: readonly string[] | null,
): ContaComSelecao<T>[] {
  const ids = escolhidas ? new Set(escolhidas) : null;
  return contas.map((c) => ({ ...c, incluida: ids ? ids.has(c.id) : c.saldo > 0 }));
}

/** Soma dos saldos das contas incluídas; null se ainda não há contas sincronizadas. */
export function calcularDisponivel(contas: readonly ContaComSelecao<ContaBase>[]): number | null {
  if (!contas.length) return null;
  const total = contas.filter((c) => c.incluida).reduce((s, c) => s + c.saldo, 0);
  return Math.round(total * 100) / 100;
}
