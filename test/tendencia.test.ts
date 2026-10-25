import { describe, expect, test } from "vitest";
import { calcularTendencia, classificar, mediana, picosDoCiclo, type MovimentoTendencia } from "@/lib/tendencia";
import { REGRAS, lerSalariosFixos } from "@/lib/tendencia-regras";
import { fimCiclo, somarDias } from "@/lib/ciclo";

const hoje = new Date("2026-10-21T12:00:00Z");
const SAL = REGRAS.categoriaSalario;
const SUB = REGRAS.categoriaSubsidio;
const REE = REGRAS.categoriaReembolso;
const RENDA = REGRAS.categoriasRenda[0];
const CASA = REGRAS.categoriasExcluidas[0];
// Sem salário fixo, para testar o cálculo a partir dos movimentos.
const R = { ...REGRAS, salariosFixos: [], mesesJanela: 6 };

const mov = (mes: string, valor: number, extra: Partial<MovimentoTendencia> = {}): MovimentoTendencia => ({
  mes,
  valor,
  categoriaId: "supermercado",
  categoriaNome: "Supermercados",
  grupo: "food_and_drinks",
  nota: "",
  transferencia: false,
  ...extra,
});
const salario = (mes: string, valor: number, nota = "Salário") =>
  mov(mes, valor, { categoriaId: SAL, categoriaNome: "Salários", grupo: "income", nota });
const JANELA = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];

describe("classificar", () => {
  test("separa salários, bónus, subsídios anuais, IRS, renda e casa", () => {
    expect(classificar(salario("2026-05", 2000))).toEqual({ componente: "salarios" });
    expect(classificar(salario("2026-08", 1500, "Bonus"))).toEqual({ anual: "bonus" });
    expect(classificar(mov("2025-12", 1779, { categoriaId: SUB, grupo: "income", nota: "Subsidio Natal" }))).toEqual({ anual: "subsidio" });
    expect(classificar(mov("2026-07", 2000, { categoriaId: SUB, grupo: "income", nota: "Subsidio Férias" }))).toEqual({ anual: "subsidio" });
    // O subsídio de alimentação é mensal.
    expect(classificar(mov("2026-07", 200, { categoriaId: SUB, grupo: "income", nota: "Subsídio Alimentação Junho" }))).toEqual({
      componente: "rendimentos",
    });
    expect(classificar(mov("2026-06", 554, { categoriaId: REE, grupo: "income", nota: "Reembolso IRS" }))).toEqual({ anual: "irs" });
    expect(classificar(mov("2026-06", 16, { categoriaId: REE, grupo: "income", nota: "Juros" }))).toEqual({ componente: "rendimentos" });
    expect(classificar(mov("2026-05", -320, { categoriaId: RENDA }))).toEqual({ componente: "renda" });
    expect(classificar(mov("2025-10", -15700, { categoriaId: CASA }))).toBeNull();
    expect(classificar(mov("2025-10", -50, { categoriaId: "x", categoriaPaiId: CASA }))).toBeNull();
    expect(classificar(mov("2026-05", -400, { transferencia: true }))).toBeNull();
  });
});

describe("calcularTendencia", () => {
  const salarios = [3436, 4512, 4392, 3920, 3521, 3536];
  const gastos = [2506, 2914, 2041, 3556, 3973, 1434];
  const base = [
    ...JANELA.map((m, i) => salario(m, salarios[i])),
    ...JANELA.map((m, i) => mov(m, -gastos[i])),
    ...JANELA.map((m) => mov(m, -320, { categoriaId: RENDA, categoriaNome: "Renda v2" })),
  ];

  test("salários: o mês normal é o 2.º mais baixo; gastos pela mediana dos ciclos", () => {
    const t = calcularTendencia({ regras: R, movimentos: base, hoje });
    expect(t.janela).toEqual({ de: "2026-04", ate: "2026-09" });
    const s = t.componentes.find((c) => c.id === "salarios")!;
    expect(s.valor).toEqual({ base: 3521, otimista: mediana(salarios), pessimista: 3436 });
    const g = t.componentes.find((c) => c.id === "gastos")!;
    expect(g.valor.base).toBe(mediana(gastos));
    expect(g.valores.map((v) => v.valor)).toEqual(gastos);
    expect(t.liquidoMensal.base).toBe(3521 - mediana(gastos) - 320);
    expect(t.picos).toEqual([]);
    expect(t.avisos).toEqual([]);
  });

  test("picos só avisam: não mudam a previsão", () => {
    const cat = (nome: string) => ({ categoriaId: nome, categoriaNome: nome });
    const movimentos = [
      ...JANELA.map((m) => mov(m, -400, cat("Supermercados"))),
      mov("2026-05", -581, cat("Seguros")), // pico
      mov("2026-06", -130, cat("Supermercados")), // 530 em junho: não é pico (menos do dobro)
      salario("2026-09", 3000),
    ];
    const t = calcularTendencia({ regras: R, movimentos, hoje });
    expect(t.picos).toEqual([{ nome: "Seguros", mesOrigem: "2026-05", total: 581, habitual: 0 }]);
    expect(picosDoCiclo(t.picos, "2027-05").map((x) => x.nome)).toEqual(["Seguros"]);
    expect(picosDoCiclo(t.picos, "2026-11")).toEqual([]);
    const fluxo = (mes: string) => t.fluxos.find((f) => f.mes === mes)!.saidas.base;
    expect(fluxo("2026-11")).toBe(400);
    expect(fluxo("2027-05")).toBe(400);
  });

  test("o valor editado substitui gastos e renda do ciclo (no ciclo atual, o que falta)", () => {
    const gastosEditados = new Map([
      ["2026-10", 100],
      ["2026-12", 3500],
    ]);
    const t = calcularTendencia({ regras: R, movimentos: base, hoje, gastosEditados });
    const g = (mes: string) => t.gastosPorCiclo.find((x) => x.mes === mes)!;
    expect(g("2026-12")).toEqual({ mes: "2026-12", automatico: mediana(gastos) + 320, editado: 3500 });
    expect(g("2026-10").automatico).toBe(320); // sem gastos finais nos ciclos de teste; renda por pagar
    expect(g("2026-11").editado).toBeNull();
    const fluxo = (mes: string) => t.fluxos.find((f) => f.mes === mes)!.saidas.base;
    expect(fluxo("2026-10")).toBe(100);
    expect(fluxo("2026-11")).toBe(mediana(gastos) + 320);
    expect(fluxo("2026-12")).toBe(3500);
  });

  test("no ciclo atual, avisa dos gastos do ano passado que ainda não aconteceram", () => {
    const cat = (nome: string) => ({ categoriaId: nome, categoriaNome: nome });
    const t = calcularTendencia({
      regras: { ...R, mesesJanela: 12 },
      hoje,
      movimentos: [mov("2025-10", -581, cat("Seguros")), mov("2025-10", -300, cat("Prendas")), mov("2026-10", -290, cat("Seguros"))],
    });
    expect(t.cicloAtual.gastoPorCategoria).toEqual({ Seguros: 290 });
    expect(picosDoCiclo(t.picos, "2026-10").map((x) => x.nome)).toEqual(["Seguros", "Prendas"]);
  });

  test("com salário fixo, os salários valem sempre a soma das partes", () => {
    const fixos = [{ nome: "Ana", valor: 1500.5 }, { nome: "Rui", valor: 1200 }, { nome: "Extra", valor: 100 }];
    const t = calcularTendencia({ regras: { ...REGRAS, salariosFixos: fixos }, movimentos: base, hoje });
    const s = t.componentes.find((c) => c.id === "salarios")!;
    expect(s.valor).toEqual({ base: 2800.5, otimista: 2800.5, pessimista: 2800.5 });
    expect(s.regra).toBe("Fixo: Ana 1500,50 € + Rui 1200 € + Extra 100 €.");
    expect(t.fluxos[1].entradas.base).toBe(2800.5);
  });

  test("SALARIOS_FIXOS: Nome:valor separados por vírgula; vazio ou inválido usa os movimentos", () => {
    expect(lerSalariosFixos("Ana:1500.50, Rui:1200")).toEqual([{ nome: "Ana", valor: 1500.5 }, { nome: "Rui", valor: 1200 }]);
    expect(lerSalariosFixos("")).toEqual([]);
    expect(lerSalariosFixos(undefined)).toEqual([]);
    const erro = console.error;
    console.error = () => {};
    expect(lerSalariosFixos("Ana:abc,Rui:1200")).toEqual([]);
    console.error = erro;
  });

  // Gastos nos últimos dias de cada ciclo da janela (abr a set).
  const noFim = (mes: string, valor: number, diasAntes = 0) =>
    mov(mes, -valor, { data: new Date(`${somarDias(fimCiclo(mes), -diasAntes)}T12:00:00Z`) });
  const finais = [noFim("2026-04", 100), noFim("2026-06", 50, 2), noFim("2026-07", 200, 4), noFim("2026-09", 30)];

  test("no ciclo atual, os gastos que faltam vêm dos mesmos últimos dias dos ciclos anteriores", () => {
    const t = calcularTendencia({
      regras: R,
      hoje, // 21 out: o ciclo de outubro acaba a 25, faltam 5 dias
      movimentos: [
        ...base,
        ...finais,
        noFim("2026-05", 500, 5), // 6.º dia antes do fim: fora
        // Registado a 2 de julho mas com a data verdadeira na nota (26 de junho, início do ciclo): fora
        mov("2026-07", -999, { data: new Date("2026-07-02T12:00:00Z"), nota: "26/6 - Jantar" }),
        salario("2026-10", 3900),
        mov("2026-10", -1000),
      ],
    });
    expect(t.cicloAtual).toMatchObject({ mes: "2026-10", inicio: "2026-09-25", fim: "2026-10-25", diasQueFaltam: 5 });
    expect(t.cicloAtual.porCiclo.map((c) => c.valor)).toEqual([100, 0, 50, 200, 0, 30]);
    expect(t.cicloAtual.gastosQueFaltam).toBe(40);
    const out = t.fluxos[0];
    expect(out.entradas.base).toBe(0); // o salário do ciclo já entrou
    expect(out.saidas.base).toBe(40 + 320); // a renda ainda não foi paga
    expect(t.fluxos[1].entradas.base).toBe(3521);
  });

  test("no último dia do ciclo só conta esse dia", () => {
    const t = calcularTendencia({
      regras: R,
      hoje: new Date("2026-10-25T10:00:00Z"),
      movimentos: [...base, ...finais, mov("2026-10", -320, { categoriaId: RENDA })],
    });
    expect(t.cicloAtual.diasQueFaltam).toBe(1);
    expect(t.cicloAtual.porCiclo.map((c) => c.valor)).toEqual([100, 0, 0, 0, 0, 30]);
    expect(t.fluxos[0].saidas.base).toBe(0);
  });

  test("a partir do dia do salário já conta o ciclo seguinte inteiro", () => {
    const t = calcularTendencia({ regras: R, movimentos: base, hoje: new Date("2026-10-26T08:00:00Z") });
    expect(t.mesAtual).toBe("2026-11");
    expect(t.janela).toEqual({ de: "2026-05", ate: "2026-10" });
    expect(t.cicloAtual.gastosQueFaltam).toBe(t.componentes.find((c) => c.id === "gastos")!.valor.base);
  });

  test("anuais repetem-se no mesmo mês; bónus e IRS ficam a zero no pessimista", () => {
    const t = calcularTendencia({ regras: R,
      hoje,
      movimentos: [
        ...base,
        mov("2025-12", 3101.8, { categoriaId: SUB, grupo: "income", nota: "Subsídio Natal" }),
        salario("2026-08", 1500, "Bonus"),
        mov("2026-06", 1200.47, { categoriaId: REE, grupo: "income", nota: "Reembolso IRS" }),
      ],
    });
    expect(t.anuais.map((a) => [a.nome, a.mesOrigem, a.valor, a.pessimista])).toEqual([
      ["Subsídio de Natal", "2025-12", 3101.8, 3101.8],
      ["Reembolso do IRS", "2026-06", 1200.47, 0],
      ["Bónus", "2026-08", 1500, 0],
    ]);
    const dez = t.fluxos.find((f) => f.mes === "2026-12")!;
    expect(dez.entradas).toEqual({ base: 3521 + 3101.8, otimista: mediana(salarios) + 3101.8, pessimista: 3436 + 3101.8 });
    const ago = t.fluxos.find((f) => f.mes === "2027-08")!;
    expect(ago.entradas.base).toBe(3521 + 1500);
    expect(ago.entradas.pessimista).toBe(3436);
  });

  test("ignora transferências e despesas da casa; mês sem movimentos conta zero", () => {
    const t = calcularTendencia({ regras: R,
      hoje,
      movimentos: [salario("2026-09", 3000), mov("2026-09", -15700, { categoriaId: CASA }), mov("2026-08", -500, { transferencia: true })],
    });
    expect(t.componentes.map((c) => c.id)).toEqual(["salarios"]);
    expect(t.componentes[0].valores.map((v) => v.valor)).toEqual([0, 0, 0, 0, 0, 3000]);
    expect(t.avisos[0]).toMatch(/1 dos últimos 6 meses/);
  });

  test("sem movimentos não há fluxos (a previsão fica como antes)", () => {
    const t = calcularTendencia({ regras: R, movimentos: [], hoje });
    expect(t.fluxos).toEqual([]);
    expect(t.avisos[0]).toMatch(/Ainda não há movimentos/);
  });
});
