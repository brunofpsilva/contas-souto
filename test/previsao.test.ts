import { describe, expect, test } from "vitest";
import { calcularPrevisao, eAtrasada, type DespesaPrevisao } from "@/lib/previsao";

const hoje = new Date("2026-10-20T12:00:00Z");
const d = (valor: number, mes: string, estado: DespesaPrevisao["estado"] = "previsto"): DespesaPrevisao => ({
  valor,
  mes,
  estado,
});

// Casos da versão antiga (casa-nova/test/previsao.test.js)
describe("casos da versão antiga", () => {
  test("subtrai as despesas por pagar mês a mês e ignora as pagas", () => {
    const p = calcularPrevisao({
      hoje,
      disponivel: 10000,
      despesas: [d(1500, "2026-11"), d(500, "2026-11"), d(3000, "2027-01"), d(999, "2026-10", "pago")],
    });
    expect(p.meses.map((m) => m.mes)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"]);
    expect(p.meses.map((m) => m.saldo)).toEqual([10000, 8000, 8000, 5000, 5000, 5000]);
    expect(p.resumo.porPagar).toBe(5000);
    expect(p.resumo.pago).toBe(999);
    expect(p.resumo.estado).toBe("ok");
  });

  test("despesas atrasadas contam no mês atual", () => {
    const p = calcularPrevisao({ hoje, disponivel: 100, despesas: [d(40, "2026-08")] });
    expect(p.meses[0].saidas).toBe(40);
    expect(p.meses[0].atrasadas).toBe(40);
  });

  test("avisa o primeiro mês sem dinheiro e o mês abaixo da reserva", () => {
    const desp = [d(800, "2026-12"), d(500, "2027-02")];
    expect(calcularPrevisao({ hoje, disponivel: 1000, despesas: desp }).resumo.mesAlerta).toBe("2027-02");
    const r = calcularPrevisao({ hoje, disponivel: 1500, despesas: desp, reserva: 500 }).resumo;
    expect(r.estado).toBe("abaixo-reserva");
    expect(r.mesAlerta).toBe("2027-02");
  });

  test("estende o horizonte até à última despesa", () => {
    const p = calcularPrevisao({ hoje, disponivel: 0, despesas: [d(1, "2027-09")] });
    expect(p.meses.at(-1)?.mes).toBe("2027-09");
  });

  test("sem saldos não calcula saldo", () => {
    const p = calcularPrevisao({ hoje, disponivel: null, despesas: [] });
    expect(p.resumo.estado).toBe("sem-saldos");
    expect(p.meses[0].saldo).toBeNull();
  });
});

describe("casos novos", () => {
  test("falta dinheiro tem prioridade sobre a reserva", () => {
    const r = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(1200, "2026-12")], reserva: 500 }).resumo;
    expect(r.estado).toBe("falta");
    expect(r.mesAlerta).toBe("2026-12");
  });

  test("ok indica o saldo mínimo", () => {
    const r = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(300, "2026-11"), d(200, "2027-01")] }).resumo;
    expect(r.estado).toBe("ok");
    expect(r.saldoMinimo).toBe(500);
    expect(r.saldoFinal).toBe(500);
  });

  test("só despesas pagas: nada por pagar", () => {
    const r = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(300, "2026-11", "pago")] }).resumo;
    expect(r.estado).toBe("nada-por-pagar");
    expect(r.nPagas).toBe(1);
  });

  test("o horizonte nunca passa de 36 meses", () => {
    const p = calcularPrevisao({ hoje, disponivel: 10000, despesas: [d(1, "2031-01")] });
    expect(p.meses).toHaveLength(36);
    expect(p.meses.at(-1)?.mes).toBe("2029-09");
  });

  test("arredonda os cêntimos sem erros de vírgula flutuante", () => {
    const p = calcularPrevisao({ hoje, disponivel: 0.3, despesas: [d(0.1, "2026-10"), d(0.2, "2026-10")] });
    expect(p.meses[0].saidas).toBe(0.3);
    expect(p.meses[0].saldo).toBe(0);
  });

  test("o mês atual conta na hora de Lisboa", () => {
    // 31 out 2026, 23:30 UTC = 23:30 em Lisboa (já em hora de inverno): ainda é outubro
    expect(calcularPrevisao({ hoje: new Date("2026-10-31T23:30:00Z"), disponivel: 0, despesas: [] }).mesAtual).toBe("2026-10");
    // 31 ago 2026, 23:30 UTC = 00:30 de 1 set em Lisboa (hora de verão)
    expect(calcularPrevisao({ hoje: new Date("2026-08-31T23:30:00Z"), disponivel: 0, despesas: [] }).mesAtual).toBe("2026-09");
  });

  test("eAtrasada só marca despesas por pagar de meses passados", () => {
    expect(eAtrasada(d(1, "2026-09"), "2026-10")).toBe(true);
    expect(eAtrasada(d(1, "2026-10"), "2026-10")).toBe(false);
    expect(eAtrasada(d(1, "2026-09", "pago"), "2026-10")).toBe(false);
  });
});
