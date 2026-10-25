import { describe, expect, test } from "vitest";
import { dataCurta, eDataValida, mesDaData, validarDataEscritura } from "@/lib/escritura";

describe("datas da escritura", () => {
  test.each([
    ["2026-12-15", true],
    ["2028-02-29", true],
    ["2027-02-29", false],
    ["2026-13-01", false],
    ["2026-12-1", false],
    ["15/12/2026", false],
    ["1999-01-01", false],
  ])("%s -> %s", (v, ok) => expect(eDataValida(v)).toBe(ok));

  test("mês e formato curto sem passar por UTC", () => {
    expect(mesDaData("2026-12-01")).toBe("2026-12");
    expect(dataCurta("2026-12-01")).toBe("1 dez 2026");
  });
});

describe("validarDataEscritura", () => {
  test("vazio apaga a data", () => {
    expect(validarDataEscritura("")).toEqual({ ok: true, data: null });
    expect(validarDataEscritura(null)).toEqual({ ok: true, data: null });
  });

  test("aceita uma data válida e recusa uma inválida", () => {
    expect(validarDataEscritura(" 2026-12-15 ")).toEqual({ ok: true, data: "2026-12-15" });
    expect(validarDataEscritura("2026-02-30").ok).toBe(false);
  });
});
