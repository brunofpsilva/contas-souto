import { describe, expect, test } from "vitest";
import { calcularPrevisao, type DespesaPrevisao } from "@/lib/previsao";
import { contasFeitas, linhasPrevisao, possiveisGastos } from "@/lib/vista-previsao";

const hoje = new Date("2026-10-20T12:00:00Z"); // mês de outubro
const ANO = 2026;
const d = (valor: number, mes: string): DespesaPrevisao => ({ valor, mes, estado: "previsto" });
const naEscritura = (valor: number): DespesaPrevisao => ({ valor, mes: "2026-12", estado: "previsto", naEscritura: true });
const i = (v: number) => ({ base: v, otimista: v, pessimista: v });
const fluxos = ["2026-10", "2026-11", "2026-12", "2027-01"].map((mes) => ({ mes, entradas: i(3500), saidas: i(2600) }));

describe("contasFeitas", () => {
  test("com marcos, as contas vão até ao último e fecham", () => {
    const p = calcularPrevisao({
      hoje,
      disponivel: 40000,
      despesas: [d(10000, "2026-12"), naEscritura(2000), d(500, "2027-01")],
      dataEscritura: "2026-12-15",
      fluxos,
    });
    const c = contasFeitas(p, ANO)!;
    expect(c).toEqual({ saldoHoje: 40000, entradas: 10500, gastos: 7800, despesas: 12000, rotulo: "Depois da escritura · 15 dez", saldo: 30700 });
    expect(c.saldoHoje + c.entradas - c.gastos - c.despesas).toBe(c.saldo);
  });

  test("sem marcos, vão até ao fim da previsão", () => {
    const p = calcularPrevisao({ hoje, disponivel: 5000, despesas: [d(1000, "2026-11")] });
    expect(contasFeitas(p, ANO)).toEqual({ saldoHoje: 5000, entradas: 0, gastos: 0, despesas: 1000, rotulo: "No fim de março de 2027", saldo: 4000 });
  });

  test("sem saldos não há contas", () => {
    expect(contasFeitas(calcularPrevisao({ hoje, disponivel: null, despesas: [] }))).toBeNull();
  });
});

describe("linhasPrevisao", () => {
  test("o mês do marco mostra o saldo antes dele; o marco mostra o saldo depois", () => {
    const p = calcularPrevisao({ hoje, disponivel: 40000, reserva: 35000, despesas: [d(10000, "2026-12"), naEscritura(2000)], dataEscritura: "2026-12-15", fluxos });
    const linhas = linhasPrevisao(p, {
      anoAtual: ANO,
      anuais: [{ tipo: "subsidio", nome: "Subsídio de Natal", mesOrigem: "2025-12", valor: 1900, pessimista: 1900 }],
      gastosPorCiclo: [{ mes: "2026-11", automatico: 2600, editado: 3000 }],
      ciclo: { mes: "2026-10", inicio: "2026-09-25", fim: "2026-10-25", diasQueFaltam: 6, gastosQueFaltam: 0, porCiclo: [], gastoPorCategoria: {} },
    });
    expect(linhas.map((l) => [l.chave, l.titulo, l.saldo, l.alerta])).toEqual([
      ["2026-10", "Outubro", 40900, null],
      ["2026-11", "Novembro", 41800, null],
      ["2026-12", "Dezembro", 32700, "reserva"],
      ["escritura", "Escritura · 15 dez", 30700, "reserva"],
    ]);
    expect(linhas[0].ate).toBe("até 25 out");
    expect(linhas[1].notas).toEqual([{ texto: "Gastos mensais ajustados" }]);
    expect(linhas[2]).toMatchObject({ marco: false, entradas: 3500, gastos: 2600, despesas: 10000, notas: [{ texto: "Inclui Subsídio de Natal", valor: 1900, privado: true }] });
    expect(linhas[3]).toMatchObject({ marco: true, entradas: 0, gastos: 0, despesas: 2000, notas: [{ texto: "1 despesa" }] });
  });

  test("sem movimentos do Wallet não há entradas nem gastos; as atrasadas ficam numa nota", () => {
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(1500, "2026-09")] });
    const [primeira] = linhasPrevisao(p, { anoAtual: ANO });
    expect(primeira).toMatchObject({ entradas: 0, gastos: 0, despesas: 1500, saldo: -500, alerta: "falta", notas: [{ texto: "Atrasadas", valor: 1500 }] });
    expect(primeira.ate).toBeUndefined();
  });
});

describe("possiveisGastos", () => {
  const pico = (nome: string, mesOrigem: string, total: number) => ({ nome, mesOrigem: mesOrigem as `${number}-${number}`, total, habitual: 0 });
  const base = { inicio: "", fim: "", diasQueFaltam: 1, gastosQueFaltam: 0, porCiclo: [] };

  test("só o mês em curso e o seguinte, e no mês em curso só o que ainda não aconteceu", () => {
    const t = {
      mesAtual: "2026-10" as const,
      picos: [pico("Seguros", "2025-10", 600), pico("Prendas", "2025-10", 300), pico("Viagens", "2025-11", 800), pico("Carro", "2025-12", 900)],
      cicloAtual: { ...base, mes: "2026-10" as const, gastoPorCategoria: { Seguros: 590 } },
    };
    expect(possiveisGastos(t, ["2026-10", "2026-11", "2026-12"])).toEqual([
      { mes: "2026-10", picos: [{ nome: "Prendas", total: 300 }] },
      { mes: "2026-11", picos: [{ nome: "Viagens", total: 800 }] },
    ]);
  });
});
