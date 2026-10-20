import { describe, expect, test } from "vitest";
import { calcularDisponivel, marcarIncluidas } from "@/lib/contas";
import { lerValor, validarDespesa, validarReserva } from "@/lib/validacao";

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
      despesa: { descricao: "Sofá", valor: 1200.5, mes: "2026-12", categoria: "Outros", quem: "Ambos", estado: "previsto", nota: "" },
    });
  });

  test("aceita os valores válidos", () => {
    const r = validarDespesa({ descricao: "Frigorífico", valor: "899", mes: "2027-01", categoria: "Eletrodomésticos", quem: "Mafalda", estado: "pago" });
    expect(r.ok && r.despesa).toMatchObject({ categoria: "Eletrodomésticos", quem: "Mafalda", estado: "pago" });
  });

  test("recusa textos demasiado longos", () => {
    const r = validarDespesa({ descricao: "x".repeat(121), valor: "1", mes: "2026-12", nota: "y".repeat(201) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["descricao", "nota"]);
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
    { id: "a1", saldo: 29926.39 },
    { id: "a2", saldo: 10297.61 },
    { id: "a4", saldo: 0 },
    { id: "c1", saldo: -250 },
  ];

  test("por defeito contam as de saldo positivo (caso da versão antiga: 40 224 €)", () => {
    const m = marcarIncluidas(contas, null);
    expect(m.filter((c) => c.incluida).map((c) => c.id)).toEqual(["a1", "a2"]);
    expect(calcularDisponivel(m)).toBe(40224);
  });

  test("com escolha, contam só as escolhidas", () => {
    expect(calcularDisponivel(marcarIncluidas(contas, ["a1"]))).toBe(29926.39);
    expect(calcularDisponivel(marcarIncluidas(contas, []))).toBe(0);
  });

  test("sem contas sincronizadas, o disponível é desconhecido", () => {
    expect(calcularDisponivel(marcarIncluidas([], null))).toBeNull();
  });
});
