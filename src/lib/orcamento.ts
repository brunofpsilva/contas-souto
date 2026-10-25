// Orçamento por divisão da casa. Conta tudo o que está registado (pago + por pagar).
// É só comparação: não entra na previsão do saldo.
import type { Estado } from "./dominio";
import { SEM_DIVISAO } from "./dominio";

export interface DivisaoOrcamento {
  id: number;
  nome: string;
  /** null = sem orçamento */
  orcamento: number | null;
}

export interface DespesaOrcamento {
  valor: number;
  estado: Estado;
  divisaoId: number | null;
}

export interface LinhaOrcamento {
  /** null = Não aplicável */
  id: number | null;
  nome: string;
  orcamento: number | null;
  pago: number;
  porPagar: number;
  total: number;
  /** Orçamento - total (negativo = passou). null sem orçamento. */
  restante: number | null;
  nDespesas: number;
}

export interface ResumoOrcamento {
  /** Pela ordem das divisões. */
  divisoes: LinhaOrcamento[];
  naoAplicavel: LinhaOrcamento;
  /**
   * Orçamento geral: soma dos orçamentos das divisões; o gasto é o de todas as divisões
   * (as que não têm orçamento também contam). Não aplicável fica de fora.
   */
  geral: { orcamento: number; pago: number; porPagar: number; total: number; restante: number; nExcedidas: number };
}

const arred = (v: number) => Math.round(v * 100) / 100;

export function calcularOrcamento(divisoes: readonly DivisaoOrcamento[], despesas: readonly DespesaOrcamento[]): ResumoOrcamento {
  const somas = new Map<number | null, { pago: number; porPagar: number; n: number }>();
  const ids = new Set(divisoes.map((d) => d.id));
  for (const d of despesas) {
    // Uma divisão que já não existe conta como Não aplicável (a BD já faz isto ao apagar).
    const chave = d.divisaoId != null && ids.has(d.divisaoId) ? d.divisaoId : null;
    const s = somas.get(chave) ?? { pago: 0, porPagar: 0, n: 0 };
    if (d.estado === "pago") s.pago += d.valor;
    else s.porPagar += d.valor;
    s.n++;
    somas.set(chave, s);
  }

  const linha = (id: number | null, nome: string, orcamento: number | null): LinhaOrcamento => {
    const s = somas.get(id) ?? { pago: 0, porPagar: 0, n: 0 };
    const total = arred(s.pago + s.porPagar);
    return {
      id,
      nome,
      orcamento,
      pago: arred(s.pago),
      porPagar: arred(s.porPagar),
      total,
      restante: orcamento == null ? null : arred(orcamento - total),
      nDespesas: s.n,
    };
  };

  const linhas = divisoes.map((d) => linha(d.id, d.nome, d.orcamento));
  const soma = (f: (l: LinhaOrcamento) => number) => arred(linhas.reduce((t, l) => t + f(l), 0));
  const orcamento = soma((l) => l.orcamento ?? 0);
  const total = soma((l) => l.total);
  return {
    divisoes: linhas,
    naoAplicavel: linha(null, SEM_DIVISAO, null),
    geral: {
      orcamento,
      pago: soma((l) => l.pago),
      porPagar: soma((l) => l.porPagar),
      total,
      restante: arred(orcamento - total),
      nExcedidas: linhas.filter((l) => l.restante != null && l.restante < 0).length,
    },
  };
}
