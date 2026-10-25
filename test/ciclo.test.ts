import { describe, expect, test } from "vitest";
import { cicloDe, cicloDoDia, diaReal, fimCiclo, inicioCiclo } from "@/lib/ciclo";

describe("ciclos do salário", () => {
  test.each([
    // [ciclo, início] — confirmados pelas notas do Wallet
    ["2026-11", "2026-10-26"], // segunda-feira
    ["2026-10", "2026-09-25"], // 26 é sábado
    ["2026-08", "2026-07-24"], // 26 é domingo
    ["2026-05", "2026-04-24"], // 26 é domingo
    ["2025-11", "2025-10-24"], // 26 é domingo
    ["2026-01", "2025-12-23"], // Natal
  ])("o ciclo %s começa a %s", (mes, inicio) => {
    expect(inicioCiclo(mes)).toBe(inicio);
  });

  test("o ciclo acaba na véspera do salário seguinte", () => {
    expect(fimCiclo("2026-10")).toBe("2026-10-25");
    expect(fimCiclo("2026-09")).toBe("2026-09-24");
    expect(fimCiclo("2025-12")).toBe("2025-12-22");
  });

  test("ciclo de um dia e de uma data em Lisboa", () => {
    expect(cicloDoDia("2026-10-25")).toBe("2026-10");
    expect(cicloDoDia("2026-10-26")).toBe("2026-11");
    expect(cicloDoDia("2026-09-25")).toBe("2026-10");
    expect(cicloDoDia("2025-12-23")).toBe("2026-01");
    expect(cicloDoDia("2026-12-18")).toBe("2026-12");
    expect(cicloDe(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10");
  });

  test("dia real: a data da nota quando é plausível, senão a do registo", () => {
    const m = (nota: string) => ({ mes: "2026-10", data: new Date("2026-10-01T23:05:00Z"), nota });
    expect(diaReal(m("25/9"))).toBe("2026-09-25");
    expect(diaReal(m("28/9 - Viagem Porto"))).toBe("2026-09-28");
    expect(diaReal(m("1/10"))).toBe("2026-10-01");
    expect(diaReal(m(""))).toBe("2026-10-02"); // 23:05 UTC = 00:05 de 2 out em Lisboa
    expect(diaReal(m("3/4 - bilhetes"))).toBe("2026-10-02"); // longe do ciclo: ignora
    expect(diaReal(m("31/2"))).toBe("2026-10-02"); // data impossível
    expect(diaReal({ mes: "2026-01", data: new Date("2026-01-02T00:00:00Z"), nota: "27/12" })).toBe("2025-12-27");
  });
});
