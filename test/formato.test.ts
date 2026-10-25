import { describe, expect, test } from "vitest";
import { euros, textoEstado } from "@/lib/formato";
import { mesCurto, mesPorExtenso, somarMeses, eMesValido } from "@/lib/meses";
import { calcularPrevisao } from "@/lib/previsao";

// Os separadores do Intl são espaços não separáveis; normalizamos para comparar.
const n = (s: string) => s.replace(/[  ]/g, " ");

describe("euros", () => {
  test("agrupa milhares mesmo com 4 dígitos", () => {
    expect(n(euros(1234.56))).toBe("1 234,56 €");
    expect(n(euros(40001))).toBe("40 001,00 €");
    expect(n(euros(-500))).toBe("-500,00 €");
    expect(n(euros(5000.4, { inteiro: true }))).toBe("5 000 €");
  });
  test("sem valor mostra um travessão", () => {
    expect(euros(null)).toBe("—");
  });
});

describe("meses", () => {
  test("soma meses e passa o ano", () => {
    expect(somarMeses("2026-11", 2)).toBe("2027-01");
    expect(somarMeses("2027-01", -1)).toBe("2026-12");
  });
  test("valida AAAA-MM", () => {
    expect(eMesValido("2026-12")).toBe(true);
    expect(eMesValido("2026-13")).toBe(false);
    expect(eMesValido("11/2026")).toBe(false);
  });
  test("nomes em português", () => {
    expect(mesPorExtenso("2027-03")).toBe("março de 2027");
    expect(mesCurto("2026-12")).toBe("dez 26");
  });
});

describe("textoEstado", () => {
  const hoje = new Date("2026-10-20T12:00:00Z");
  test("as quatro frases", () => {
    const desp = [{ valor: 800, mes: "2026-12", estado: "previsto" as const }];
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 500, despesas: desp }).resumo).texto).toBe(
      "Falta dinheiro em dezembro de 2026",
    );
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 1000, despesas: desp, reserva: 500 }).resumo).texto).toBe(
      "Abaixo da reserva em dezembro de 2026",
    );
    expect(n(textoEstado(calcularPrevisao({ hoje, disponivel: 2000, despesas: desp }).resumo).texto)).toBe(
      "Chega para tudo · mínimo 1 200 €",
    );
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 2000, despesas: [] }).resumo).texto).toBe("Nada por pagar");
  });

  test("diz em que marco falta o dinheiro", () => {
    const desp = [
      { valor: 500, mes: "2026-12", estado: "previsto" as const, naEscritura: true },
      { valor: 800, mes: "2026-12", estado: "previsto" as const, naConclusaoObra: true },
    ];
    const datas = { dataEscritura: "2026-12-05", dataConclusaoObra: "2026-12-20" };
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: desp, ...datas });
    expect(textoEstado(p.resumo, p).texto).toBe("Falta dinheiro na conclusão da obra");
    // Se já faltava antes dos marcos, diz o mês.
    const q = calcularPrevisao({ hoje, disponivel: 1000, despesas: [...desp, { valor: 2000, mes: "2026-12", estado: "previsto" }], ...datas });
    expect(textoEstado(q.resumo, q).texto).toBe("Falta dinheiro em dezembro de 2026");
  });
});
