import { describe, expect, test } from "vitest";
import { calcularOrcamento } from "@/lib/orcamento";
import { lerIdDivisao, validarDespesa, validarDivisoes, validarNomeDivisao, validarOrcamento } from "@/lib/validacao";

const divisoes = [
  { id: 1, nome: "Geral", orcamento: 1000 },
  { id: 2, nome: "Sala", orcamento: 500 },
  { id: 3, nome: "Garagem", orcamento: null },
];

describe("calcularOrcamento", () => {
  test("soma pago e por pagar por divisão e calcula o orçamento geral", () => {
    const o = calcularOrcamento(divisoes, [
      { valor: 300, estado: "pago", divisaoId: 1 },
      { valor: 200.1, estado: "previsto", divisaoId: 1 },
      { valor: 600, estado: "previsto", divisaoId: 2 },
      { valor: 50, estado: "pago", divisaoId: 3 },
      { valor: 999, estado: "previsto", divisaoId: null },
    ]);
    expect(o.divisoes.map((l) => [l.nome, l.pago, l.porPagar, l.total, l.restante, l.nDespesas])).toEqual([
      ["Geral", 300, 200.1, 500.1, 499.9, 2],
      ["Sala", 0, 600, 600, -100, 1],
      ["Garagem", 50, 0, 50, null, 1],
    ]);
    expect(o.naoAplicavel).toMatchObject({ id: null, nome: "Não aplicável", total: 999, orcamento: null, restante: null });
    // Não aplicável fica de fora; a Garagem (sem orçamento) conta no gasto.
    expect(o.geral).toEqual({ orcamento: 1500, pago: 350, porPagar: 800.1, total: 1150.1, restante: 349.9, nExcedidas: 1 });
  });

  test("despesa de uma divisão que já não existe conta como Não aplicável", () => {
    const o = calcularOrcamento(divisoes, [{ valor: 10, estado: "pago", divisaoId: 99 }]);
    expect(o.naoAplicavel.total).toBe(10);
    expect(o.geral.total).toBe(0);
  });

  test("sem divisões nem despesas", () => {
    const o = calcularOrcamento([], []);
    expect(o.divisoes).toEqual([]);
    expect(o.geral).toEqual({ orcamento: 0, pago: 0, porPagar: 0, total: 0, restante: 0, nExcedidas: 0 });
  });
});

describe("divisão na despesa", () => {
  test.each([
    ["3", 3],
    [" 12 ", 12],
    ["nenhuma", null],
    ["", null],
    ["0", null],
    ["-1", null],
    ["1.5", null],
    [undefined, null],
  ])("lerIdDivisao(%s) = %s", (entrada, esperado) => {
    expect(lerIdDivisao(entrada)).toBe(esperado);
  });

  test("validarDespesa guarda a divisão escolhida", () => {
    const r = validarDespesa({ descricao: "Sofá", valor: "800", mes: "2026-12", divisao: "4" });
    expect(r.ok && r.despesa.divisaoId).toBe(4);
  });
});

describe("validação das divisões", () => {
  test("nome: limpa espaços, recusa vazio, comprido e Não aplicável", () => {
    expect(validarNomeDivisao("  Casa   de banho ")).toEqual({ ok: true, nome: "Casa de banho" });
    expect(validarNomeDivisao("").ok).toBe(false);
    expect(validarNomeDivisao("x".repeat(41)).ok).toBe(false);
    expect(validarNomeDivisao("nao aplicável").ok).toBe(false);
  });

  test("orçamento: vazio = sem orçamento", () => {
    expect(validarOrcamento("")).toEqual({ ok: true, valor: null });
    expect(validarOrcamento("2 500,50")).toEqual({ ok: true, valor: 2500.5 });
    expect(validarOrcamento("0")).toEqual({ ok: true, valor: 0 });
    expect(validarOrcamento("-5").ok).toBe(false);
    expect(validarOrcamento("abc").ok).toBe(false);
  });

  test("formulário de todas as divisões", () => {
    const r = validarDivisoes([
      ["nome:1", "Geral"],
      ["orcamento:1", "1000"],
      ["nome:2", "Sala"],
      ["orcamento:2", ""],
      ["$ACTION_ID", "x"],
    ]);
    expect(r).toEqual({
      ok: true,
      divisoes: [
        { id: 1, nome: "Geral", orcamento: 1000 },
        { id: 2, nome: "Sala", orcamento: null },
      ],
    });
  });

  test("recusa nomes repetidos sem contar maiúsculas e acentos", () => {
    const r = validarDivisoes([
      ["nome:1", "Sala"],
      ["nome:2", "sála"],
    ]);
    expect(r.ok).toBe(false);
  });

  test("recusa orçamento inválido indicando a divisão", () => {
    const r = validarDivisoes([
      ["nome:1", "Sala"],
      ["orcamento:1", "muito"],
    ]);
    expect(r).toEqual({ ok: false, erro: "Sala: O orçamento tem de ser um número igual ou maior que zero." });
  });
});
