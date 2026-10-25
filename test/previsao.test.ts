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

  test("o mês atual é o ciclo do salário, na hora de Lisboa", () => {
    const mes = (iso: string) => calcularPrevisao({ hoje: new Date(iso), disponivel: 0, despesas: [] }).mesAtual;
    // 25 out 2026, 23:30 UTC = 23:30 em Lisboa (já em hora de inverno): último dia do ciclo de outubro
    expect(mes("2026-10-25T23:30:00Z")).toBe("2026-10");
    // 26 out (segunda-feira, dia do salário): já é o ciclo de novembro
    expect(mes("2026-10-26T08:00:00Z")).toBe("2026-11");
    // 25 ago 2026, 23:30 UTC = 00:30 de 26 ago em Lisboa (hora de verão): ciclo de setembro
    expect(mes("2026-08-25T23:30:00Z")).toBe("2026-09");
  });

  test("eAtrasada só marca despesas por pagar de meses passados", () => {
    expect(eAtrasada(d(1, "2026-09"), "2026-10")).toBe(true);
    expect(eAtrasada(d(1, "2026-10"), "2026-10")).toBe(false);
    expect(eAtrasada(d(1, "2026-09", "pago"), "2026-10")).toBe(false);
  });
});

describe("escritura", () => {
  const de = (valor: number, mes: string, estado: DespesaPrevisao["estado"] = "previsto"): DespesaPrevisao => ({
    valor,
    mes,
    estado,
    naEscritura: true,
  });

  test("a previsão acaba no mês da escritura, se não houver despesas depois", () => {
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(1, "2026-11"), d(1, "2027-06", "pago")], dataEscritura: "2026-12-15" });
    expect(p.meses.map((m) => m.mes)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(p.meses.map((m) => m.marcos)).toEqual([[], [], ["escritura"]]);
  });

  test("com uma despesa por pagar depois da escritura, a previsão vai até ao mês dela", () => {
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: [d(1, "2027-02")], dataEscritura: "2026-12-15" });
    expect(p.meses.map((m) => m.mes)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(p.meses.map((m) => m.marcos)).toEqual([[], [], ["escritura"], [], []]);
    expect(p.fim?.tipo).toBe("escritura");
  });

  test("no mês da escritura, as despesas com mês próprio contam antes", () => {
    const p = calcularPrevisao({
      hoje,
      disponivel: 10000,
      despesas: [d(1000, "2026-11"), d(500, "2026-12"), de(2000, "2026-12"), de(300, "2026-12", "pago")],
      dataEscritura: "2026-12-15",
    });
    expect(p.escritura).toMatchObject({
      mes: "2026-12",
      antes: { base: 8500, otimista: 8500, pessimista: 8500 },
      depois: { base: 6500, otimista: 6500, pessimista: 6500 },
      porPagar: 2000,
      nPorPagar: 1,
      pago: 300,
      nPagas: 1,
    });
    expect(p.percurso).toEqual({ entradas: 0, gastos: 0, despesasCasa: 1500 });
    expect(p.resumo.saldoFinal).toBe(6500);
  });

  test("despesas depois da escritura entram, com o dia a dia a continuar", () => {
    const i = (v: number) => ({ base: v, otimista: v, pessimista: v });
    const fluxos = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"].map((mes) => ({ mes, entradas: i(100), saidas: i(0) }));
    const p = calcularPrevisao({
      hoje,
      disponivel: 5000,
      despesas: [d(1000, "2027-02"), d(500, "2027-03"), de(2000, "2026-12")],
      dataEscritura: "2026-12-15",
      fluxos,
    });
    expect(p.depoisDoFim).toEqual({ n: 0, valor: 0 });
    expect(p.escritura?.depois?.base).toBe(5000 + 300 - 2000);
    expect(p.meses.at(-1)).toMatchObject({ mes: "2027-03", saldo: 5000 + 600 - 3500 });
    expect(p.resumo.saldoFinal).toBe(2100);
    // O percurso continua a ser só até à escritura.
    expect(p.percurso).toEqual({ entradas: 300, gastos: 0, despesasCasa: 0 });
  });

  test("o dia a dia entra até à escritura, com intervalo, e o percurso bate certo", () => {
    const i = (base: number, otimista: number, pessimista: number) => ({ base, otimista, pessimista });
    const fluxos = ["2026-10", "2026-11", "2026-12", "2027-01"].map((mes) => ({
      mes,
      entradas: i(3500, 3700, 3400),
      saidas: i(2600, 2000, 3500),
    }));
    const p = calcularPrevisao({ hoje, disponivel: 40000, despesas: [d(10000, "2026-12"), de(2000, "2026-12")], dataEscritura: "2026-12-15", fluxos });
    const e = p.escritura!;
    expect(p.comFluxos).toBe(true);
    expect(p.percurso).toEqual({ entradas: 10500, gastos: 7800, despesasCasa: 10000 });
    expect(e.antes).toEqual({ base: 40000 + 10500 - 7800 - 10000, otimista: 40000 + 3 * 1700 - 10000, pessimista: 40000 - 3 * 100 - 10000 });
    expect(e.depois?.base).toBe(e.antes!.base - 2000);
  });

  test("o extrato fecha: hoje + entradas − gastos − despesas = saldo depois da escritura", () => {
    const i = (v: number) => ({ base: v, otimista: v, pessimista: v });
    const fluxos = ["2026-10", "2026-11", "2026-12"].map((mes) => ({ mes, entradas: i(3500), saidas: i(2600) }));
    const p = calcularPrevisao({ hoje, disponivel: 40000, despesas: [d(10000, "2026-12"), de(2000, "2026-12")], dataEscritura: "2026-12-15", fluxos });
    const soma = p.meses.reduce((s, m) => s + m.entradasPrevistas - m.saidasPrevistas - m.saidas, 0);
    expect(p.escritura!.depois!.base).toBe(40000 + soma);
  });

  test("escritura já passada: comportamento normal e despesas atrasadas", () => {
    const p = calcularPrevisao({ hoje, disponivel: 3000, despesas: [de(1000, "2026-08")], dataEscritura: "2026-08-20" });
    expect(p.escritura).toBeNull();
    expect(p.meses).toHaveLength(6);
    expect(p.meses[0]).toMatchObject({ atrasadas: 1000, marcos: [] });
  });

  test("sem data da escritura, o resultado não muda", () => {
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: [de(300, "2026-12")] });
    expect(p.escritura).toBeNull();
    expect(p.meses.every((m) => !m.marcos.length && m.nosMarcos === 0)).toBe(true);
    expect(p.meses.find((m) => m.mes === "2026-12")!.saldo).toBe(700);
  });
});

describe("conclusão da obra", () => {
  const de = (valor: number, mes: string): DespesaPrevisao => ({ valor, mes, estado: "previsto", naEscritura: true });
  const dob = (valor: number, mes: string, estado: DespesaPrevisao["estado"] = "previsto"): DespesaPrevisao => ({
    valor,
    mes,
    estado,
    naConclusaoObra: true,
  });

  test("obra depois da escritura: a previsão passa pelos dois marcos e vai até à última despesa", () => {
    const p = calcularPrevisao({
      hoje,
      disponivel: 10000,
      // a da obra tem um mês guardado antigo: conta sempre no mês da obra
      despesas: [d(1000, "2027-01"), de(2000, "2026-12"), dob(5000, "2026-11"), d(300, "2027-05")],
      dataEscritura: "2026-12-15",
      dataConclusaoObra: "2027-03-10",
    });
    expect(p.meses.map((m) => m.mes)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"]);
    expect(p.meses.map((m) => m.saldo)).toEqual([10000, 10000, 8000, 7000, 7000, 2000, 2000, 1700]);
    expect(p.marcos.map((m) => m.tipo)).toEqual(["escritura", "obra"]);
    expect(p.escritura).toMatchObject({ antes: { base: 10000 }, depois: { base: 8000 } });
    expect(p.obra).toMatchObject({ mes: "2027-03", antes: { base: 7000 }, depois: { base: 2000 }, porPagar: 5000, nPorPagar: 1 });
    expect(p.fim?.tipo).toBe("obra");
    expect(p.depoisDoFim).toEqual({ n: 0, valor: 0 });
    expect(p.percurso?.despesasCasa).toBe(1000);
  });

  test("obra antes da escritura: a escritura continua a ser o fim", () => {
    const p = calcularPrevisao({
      hoje,
      disponivel: 10000,
      despesas: [dob(4000, "2026-11"), de(2000, "2027-01")],
      dataEscritura: "2027-01-15",
      dataConclusaoObra: "2026-11-10",
    });
    expect(p.meses.at(-1)?.mes).toBe("2027-01");
    expect(p.fim?.tipo).toBe("escritura");
    expect(p.obra).toMatchObject({ antes: { base: 10000 }, depois: { base: 6000 } });
    expect(p.resumo.saldoFinal).toBe(4000);
  });

  test("os dois no mesmo mês seguem a ordem das datas", () => {
    const p = calcularPrevisao({
      hoje,
      disponivel: 10000,
      despesas: [d(500, "2026-12"), de(2000, "2026-12"), dob(3000, "2026-12")],
      dataEscritura: "2026-12-20",
      dataConclusaoObra: "2026-12-05",
    });
    const dez = p.meses.find((m) => m.mes === "2026-12")!;
    expect(dez).toMatchObject({ marcos: ["obra", "escritura"], saidas: 5500, nosMarcos: 5000, saldo: 4500 });
    expect(p.obra).toMatchObject({ antes: { base: 9500 }, depois: { base: 6500 } });
    expect(p.escritura).toMatchObject({ antes: { base: 6500 }, depois: { base: 4500 } });
    expect(p.fim?.tipo).toBe("escritura");
  });

  test("obra já passada: as despesas dela ficam atrasadas, como as outras", () => {
    const p = calcularPrevisao({ hoje, disponivel: 3000, despesas: [dob(1000, "2026-08")], dataConclusaoObra: "2026-08-20" });
    expect(p.obra).toBeNull();
    expect(p.fim).toBeNull();
    expect(p.meses).toHaveLength(6);
    expect(p.meses[0]).toMatchObject({ atrasadas: 1000, marcos: [] });
  });

  test("só com data da obra, a previsão acaba na obra", () => {
    const p = calcularPrevisao({ hoje, disponivel: 1000, despesas: [dob(300, "2026-12")], dataConclusaoObra: "2026-12-01" });
    expect(p.escritura).toBeNull();
    expect(p.fim?.tipo).toBe("obra");
    expect(p.meses.at(-1)?.mes).toBe("2026-12");
    expect(p.resumo.saldoFinal).toBe(700);
  });

  test("um marco depois do dia do salário conta no ciclo seguinte", () => {
    // 28 dez 2026 já é o ciclo de janeiro (o salário de dezembro cai a 23)
    const p = calcularPrevisao({ hoje, disponivel: 5000, despesas: [de(2000, "2026-12")], dataEscritura: "2026-12-28" });
    expect(p.escritura?.mes).toBe("2027-01");
    expect(p.meses.find((m) => m.mes === "2026-12")!.saidas).toBe(0);
    expect(p.meses.find((m) => m.mes === "2027-01")!.nosMarcos).toBe(2000);
  });
});
