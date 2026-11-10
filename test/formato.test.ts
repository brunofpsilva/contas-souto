import { describe, expect, test } from "vitest";
import { dataHora, euros, maiuscula, plural, textoEstado } from "@/lib/formato";
import { mesLongo, mesNoEixo, mesPorExtenso, somarMeses, eMesValido } from "@/lib/meses";
import { calcularPrevisao } from "@/lib/previsao";

// Os separadores do Intl são espaços não separáveis; normalizamos para comparar.
const n = (s: string) => s.replace(/[  ]/g, " ");

describe("euros", () => {
  test("agrupa milhares mesmo com 4 dígitos", () => {
    expect(n(euros(1234.56))).toBe("1 234,56 €");
    expect(n(euros(40001))).toBe("40 001,00 €");
    expect(n(euros(5000.4, { inteiro: true }))).toBe("5 000 €");
  });
  test("um só sinal de menos (U+2212), e o mais só quando se pede", () => {
    expect(n(euros(-500))).toBe("−500,00 €");
    expect(n(euros(-2500.4, { inteiro: true, sinal: true }))).toBe("−2 500 €");
    expect(n(euros(3900, { inteiro: true, sinal: true }))).toBe("+3 900 €");
    expect(n(euros(3900, { inteiro: true }))).toBe("3 900 €");
    // Um valor que arredonda a zero não leva sinal.
    expect(n(euros(-0.2, { inteiro: true, sinal: true }))).toBe("0 €");
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
    expect(mesNoEixo("2026-12")).toBe("dez");
    expect(mesNoEixo("2027-01")).toBe("jan 27");
  });
  test("o mês por extenso só leva o ano quando não é o corrente", () => {
    expect(mesLongo("2026-12", 2026)).toBe("dezembro");
    expect(mesLongo("2027-01", 2026)).toBe("janeiro de 2027");
  });
});

describe("textos", () => {
  test("data com hora, na hora de Lisboa", () => {
    expect(dataHora(new Date("2026-11-10T09:14:00Z"))).toBe("10 nov, 09:14");
    // No verão, Lisboa está uma hora à frente de UTC.
    expect(dataHora("2026-07-01T23:30:00Z")).toBe("2 jul, 00:30");
    expect(dataHora(null)).toBe("—");
  });
  test("maiúscula inicial e plural", () => {
    expect(maiuscula("dezembro de 2026")).toBe("Dezembro de 2026");
    expect(plural(1, "despesa")).toBe("1 despesa");
    expect(plural(3, "despesa")).toBe("3 despesas");
    expect(plural(2, "divisão", "divisões")).toBe("2 divisões");
  });
});

describe("textoEstado", () => {
  const hoje = new Date("2026-10-20T12:00:00Z");
  test("as frases de cada estado", () => {
    const desp = [{ valor: 800, mes: "2026-12", estado: "previsto" as const }];
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 500, despesas: desp }).resumo).texto).toBe(
      "Falta dinheiro em dezembro de 2026",
    );
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 1000, despesas: desp, reserva: 500 }).resumo).texto).toBe(
      "Abaixo da reserva em dezembro de 2026",
    );
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 2000, despesas: desp }).resumo).texto).toBe("Chega para tudo");
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: 2000, despesas: [] }).resumo).texto).toBe("Nada por pagar");
    expect(textoEstado(calcularPrevisao({ hoje, disponivel: null, despesas: desp }).resumo).texto).toBe("Sem saldos");
  });

  test("diz em que marco falta o dinheiro", () => {
    const desp = [
      { valor: 500, mes: "2026-12", estado: "previsto" as const, naEscritura: true },
      { valor: 800, mes: "2026-12", estado: "previsto" as const, naConclusaoObra: true },
    ];
    const datas = { dataEscritura: "2026-12-05", dataConclusaoObra: "2026-12-20" };
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: desp, ...datas });
    expect(textoEstado(p.resumo, p).texto).toBe("Falta dinheiro no fim da obra");
    // Se já faltava antes dos marcos, diz o mês.
    const q = calcularPrevisao({ hoje, disponivel: 1000, despesas: [...desp, { valor: 2000, mes: "2026-12", estado: "previsto" }], ...datas });
    expect(textoEstado(q.resumo, q).texto).toBe("Falta dinheiro em dezembro de 2026");
  });
});
