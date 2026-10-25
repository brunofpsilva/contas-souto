import { describe, expect, test } from "vitest";
import { calcularDisponivel, marcarIncluidas } from "@/lib/contas";
import { lerValor, validarDespesa, validarGastosEditados, validarReserva } from "@/lib/validacao";

describe("lerValor", () => {
  test.each([
    ["1234,56", 1234.56],
    ["1 234,56", 1234.56],
    ["1 234,56 €", 1234.56],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["1234.56", 1234.56],
    ["1.234", 1234],
    ["12.5", 12.5],
    ["0,1", 0.1],
    ["800", 800],
    [1200.555, 1200.56],
  ])("%s -> %s", (entrada, esperado) => {
    expect(lerValor(entrada)).toBe(esperado);
  });

  test.each(["", "abc", "1,2,3", "12a", "--1"])("inválido: %s", (entrada) => {
    expect(lerValor(entrada)).toBeNull();
  });
});

describe("validarDespesa (regras da versão antiga)", () => {
  test("recusa descrição vazia, valor negativo e mês mal formatado", () => {
    const r = validarDespesa({ descricao: "", valor: "-1", mes: "11/2026" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["descricao", "mes", "valor"]);
  });

  test("normaliza categoria, quem e estado desconhecidos", () => {
    const r = validarDespesa({ descricao: " Sofá ", valor: "1 200,5", mes: "2026-12", categoria: "?", quem: "?", estado: "?" });
    expect(r).toEqual({
      ok: true,
      despesa: { descricao: "Sofá", valor: 1200.5, mes: "2026-12", categoria: "Outros", quem: "Ambos", estado: "previsto", nota: "", naEscritura: false, naConclusaoObra: false, divisaoId: null },
    });
  });

  test("aceita os valores válidos", () => {
    const r = validarDespesa({ descricao: "Frigorífico", valor: "899", mes: "2027-01", categoria: "Eletrodomésticos", quem: "Ana", estado: "pago" });
    expect(r.ok && r.despesa).toMatchObject({ categoria: "Eletrodomésticos", quem: "Ana", estado: "pago" });
  });

  test("recusa textos demasiado longos", () => {
    const r = validarDespesa({ descricao: "x".repeat(121), valor: "1", mes: "2026-12", nota: "y".repeat(201) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["descricao", "nota"]);
  });
});

describe("validarDespesa na escritura", () => {
  test("fica com o mês da data da escritura, ignorando o mês escrito", () => {
    const r = validarDespesa({ descricao: "IMT", valor: "5000", quando: "escritura", mes: "2026-11" }, { dataEscritura: "2027-01-15" });
    expect(r.ok && r.despesa).toMatchObject({ mes: "2027-01", naEscritura: true });
  });

  test("sem data da escritura não deixa escolher na escritura", () => {
    const r = validarDespesa({ descricao: "IMT", valor: "5000", quando: "escritura", mes: "2026-11" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.mes).toMatch(/data da escritura/);
  });
});

describe("reserva", () => {
  test("vazio é zero; negativo é recusado", () => {
    expect(validarReserva("")).toEqual({ ok: true, valor: 0 });
    expect(validarReserva("5 000")).toEqual({ ok: true, valor: 5000 });
    expect(validarReserva("-1").ok).toBe(false);
  });
});

describe("contas que contam", () => {
  const contas = [
    { id: "a1", saldo: 25000.39 },
    { id: "a2", saldo: 15000.61 },
    { id: "a4", saldo: 0 },
    { id: "c1", saldo: -250 },
  ];

  test("por defeito contam as de saldo positivo (caso da versão antiga: 40 224 €)", () => {
    const m = marcarIncluidas(contas, null);
    expect(m.filter((c) => c.incluida).map((c) => c.id)).toEqual(["a1", "a2"]);
    expect(calcularDisponivel(m)).toBe(40001);
  });

  test("com escolha, contam só as escolhidas", () => {
    expect(calcularDisponivel(marcarIncluidas(contas, ["a1"]))).toBe(25000.39);
    expect(calcularDisponivel(marcarIncluidas(contas, []))).toBe(0);
  });

  test("sem contas sincronizadas, o disponível é desconhecido", () => {
    expect(calcularDisponivel(marcarIncluidas([], null))).toBeNull();
  });
});

describe("gastos editados", () => {
  test("lê os campos por ciclo; vazio volta ao automático", () => {
    const r = validarGastosEditados([
      ["gasto:2026-11", "2 500"],
      ["gasto:2026-12", ""],
      ["outro", "x"],
    ]);
    expect(r).toEqual({ ok: true, guardar: [{ mes: "2026-11", valor: 2500 }], apagar: ["2026-12"] });
  });

  test("recusa meses e valores inválidos", () => {
    expect(validarGastosEditados([["gasto:2026-13", "1"]]).ok).toBe(false);
    expect(validarGastosEditados([["gasto:2026-11", "-5"]]).ok).toBe(false);
    expect(validarGastosEditados([["gasto:2026-11", "abc"]]).ok).toBe(false);
  });
});

describe("validarDespesa na conclusão da obra", () => {
  test("fica com o ciclo da data da obra e não fica na escritura", () => {
    const r = validarDespesa(
      { descricao: "Empreiteiro", valor: "15000", quando: "obra", mes: "2026-11" },
      { dataEscritura: "2026-12-15", dataConclusaoObra: "2027-03-10" },
    );
    expect(r.ok && r.despesa).toMatchObject({ mes: "2027-03", naConclusaoObra: true, naEscritura: false });
  });

  test("sem data da obra não deixa escolher", () => {
    const r = validarDespesa({ descricao: "Empreiteiro", valor: "1", quando: "obra", mes: "2026-11" }, { dataEscritura: "2026-12-15" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.mes).toMatch(/conclusão da obra/);
  });

  test("uma data depois do dia do salário fica no ciclo seguinte", () => {
    const r = validarDespesa({ descricao: "IMT", valor: "1", quando: "escritura", mes: "" }, { dataEscritura: "2026-12-28" });
    expect(r.ok && r.despesa.mes).toBe("2027-01");
  });
});
