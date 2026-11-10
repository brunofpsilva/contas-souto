import { describe, expect, test } from "vitest";
import { proximosPagamentos, resumoInicio } from "@/lib/inicio";
import { calcularPrevisao, type DespesaPrevisao } from "@/lib/previsao";

const hoje = new Date("2026-10-20T12:00:00Z"); // mês de outubro (o seguinte começa a 26)
const ANO = 2026;
const d = (valor: number, mes: string): DespesaPrevisao => ({ valor, mes, estado: "previsto" });
const naEscritura = (valor: number): DespesaPrevisao => ({ valor, mes: "2026-12", estado: "previsto", naEscritura: true });
const naObra = (valor: number): DespesaPrevisao => ({ valor, mes: "2027-03", estado: "previsto", naConclusaoObra: true });
const datas = { dataEscritura: "2026-12-15", dataConclusaoObra: "2027-03-20" };

describe("resumoInicio", () => {
  test("chega: o número é o saldo depois do último marco", () => {
    const p = calcularPrevisao({ hoje, disponivel: 40000, despesas: [naEscritura(12000), naObra(15000)], ...datas });
    expect(resumoInicio(p, ANO)).toEqual({
      tom: "ok",
      titulo: "Chega para tudo",
      valor: 13000,
      contexto: "depois da obra · 20 mar 2027",
      extra: null,
    });
  });

  test("com despesas depois do último marco, mostra também o fim da previsão", () => {
    const p = calcularPrevisao({ hoje, disponivel: 40000, despesas: [naEscritura(12000), d(1000, "2027-02")], dataEscritura: datas.dataEscritura });
    expect(resumoInicio(p, ANO)).toMatchObject({
      valor: 28000,
      contexto: "depois da escritura · 15 dez",
      extra: { texto: "No fim de fevereiro de 2027", valor: 27000 },
    });
  });

  test("sem marcos, é o saldo no fim da previsão", () => {
    const p = calcularPrevisao({ hoje, disponivel: 5000, despesas: [d(1000, "2026-11")] });
    expect(resumoInicio(p, ANO)).toMatchObject({ titulo: "Chega para tudo", valor: 4000, contexto: "no fim de março de 2027", extra: null });
  });

  test("falta dinheiro num marco: o número é o saldo depois desse marco, e o do último vai por baixo", () => {
    const fluxos = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"].map((mes) => {
      const i = (v: number) => ({ base: v, otimista: v, pessimista: v });
      return { mes, entradas: i(mes > "2026-12" ? 3000 : 0), saidas: i(0) };
    });
    const p = calcularPrevisao({ hoje, disponivel: 10000, despesas: [naEscritura(12000), naObra(1000)], ...datas, fluxos });
    expect(resumoInicio(p, ANO)).toEqual({
      tom: "mau",
      titulo: "Falta dinheiro na escritura",
      valor: -2000,
      contexto: "depois da escritura · 15 dez",
      extra: { texto: "Depois da obra (20 mar 2027)", valor: 6000 },
    });
  });

  test("falta dinheiro no último marco: sem linha extra", () => {
    const p = calcularPrevisao({ hoje, disponivel: 10000, despesas: [naEscritura(12000)], dataEscritura: datas.dataEscritura });
    expect(resumoInicio(p, ANO)).toEqual({
      tom: "mau",
      titulo: "Falta dinheiro na escritura",
      valor: -2000,
      contexto: "depois da escritura · 15 dez",
      extra: null,
    });
  });

  test("falta dinheiro num mês antes do marco: o número é o saldo no fim desse mês", () => {
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(3000, "2026-11"), naEscritura(500)], dataEscritura: datas.dataEscritura });
    expect(resumoInicio(p, ANO)).toEqual({
      tom: "mau",
      titulo: "Falta dinheiro em novembro de 2026",
      valor: -2000,
      contexto: "no fim de novembro",
      extra: { texto: "Depois da escritura (15 dez)", valor: -2500 },
    });
  });

  test("abaixo da reserva: o número é o saldo nesse ponto e a linha extra lembra a reserva", () => {
    const p = calcularPrevisao({ hoje, disponivel: 10000, reserva: 5000, despesas: [naEscritura(7000)], dataEscritura: datas.dataEscritura });
    expect(resumoInicio(p, ANO)).toEqual({
      tom: "aviso",
      titulo: "Abaixo da reserva na escritura",
      valor: 3000,
      contexto: "depois da escritura · 15 dez",
      extra: { texto: "Reserva mínima", valor: 5000 },
    });
  });

  test("sem saldos não há número", () => {
    const p = calcularPrevisao({ hoje, disponivel: null, despesas: [d(100, "2026-11")] });
    expect(resumoInicio(p, ANO)).toEqual({ tom: "neutro", titulo: "Sem saldos", valor: null, contexto: "", extra: null });
  });
});

describe("proximosPagamentos", () => {
  const lista = [
    { id: 1, valor: 100, mes: "2026-12", estado: "previsto" as const },
    { id: 2, valor: 900, mes: "2026-11", estado: "previsto" as const },
    { id: 3, valor: 50, mes: "2026-09", estado: "previsto" as const },
    { id: 4, valor: 999, mes: "2026-10", estado: "pago" as const },
    { id: 5, valor: 300, mes: "2026-11", estado: "previsto" as const },
    { id: 6, valor: 10, mes: "2027-01", estado: "previsto" as const },
  ];

  test("atrasadas primeiro, depois por mês e por valor; as pagas não entram", () => {
    expect(proximosPagamentos(lista, "2026-10").map((x) => [x.id, x.atrasada])).toEqual([
      [3, true],
      [2, false],
      [5, false],
      [1, false],
    ]);
    expect(proximosPagamentos(lista, "2026-10", 2).map((x) => x.id)).toEqual([3, 2]);
  });
});
