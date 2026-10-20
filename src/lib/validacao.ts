// Validação dos dados que chegam dos formulários (mesmas regras da versão antiga).
import { CATEGORIAS, LIMITE_DESCRICAO, LIMITE_NOTA, PESSOAS, type Categoria, type Estado, type Pessoa } from "./dominio";
import { eMesValido } from "./meses";

/**
 * Lê um valor em euros escrito à portuguesa ou à inglesa:
 * "1 234,56", "1.234,56", "1234.56", "1234,5", "1 234 €". Devolve null se não for número.
 */
export function lerValor(entrada: unknown): number | null {
  if (typeof entrada === "number") return Number.isFinite(entrada) ? Math.round(entrada * 100) / 100 : null;
  if (typeof entrada !== "string") return null;
  let s = entrada.replace(/[\s  €]/g, "");
  if (!s) return null;
  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");
  if (temVirgula && temPonto) {
    // O último separador é o decimal.
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (temVirgula) {
    s = s.replace(",", ".");
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export interface DadosDespesa {
  descricao: string;
  valor: number;
  mes: string;
  categoria: Categoria;
  quem: Pessoa;
  estado: Estado;
  nota: string;
}

export type ErrosDespesa = Partial<Record<keyof DadosDespesa, string>>;

export function validarDespesa(
  input: Record<string, unknown>,
): { ok: true; despesa: DadosDespesa } | { ok: false; erros: ErrosDespesa } {
  const erros: ErrosDespesa = {};
  const descricao = String(input.descricao ?? "").trim();
  const valor = lerValor(input.valor);
  const mes = String(input.mes ?? "").trim();
  const categoria = CATEGORIAS.find((c) => c === input.categoria) ?? "Outros";
  const quem = PESSOAS.find((p) => p === input.quem) ?? "Ambos";
  const estado: Estado = input.estado === "pago" ? "pago" : "previsto";
  const nota = String(input.nota ?? "").trim();

  if (!descricao) erros.descricao = "A descrição é obrigatória.";
  else if (descricao.length > LIMITE_DESCRICAO) erros.descricao = `A descrição tem no máximo ${LIMITE_DESCRICAO} caracteres.`;
  if (valor == null) erros.valor = "O valor tem de ser um número, por exemplo 1 234,56.";
  else if (valor < 0) erros.valor = "O valor tem de ser igual ou maior que zero.";
  else if (valor >= 1e10) erros.valor = "O valor é demasiado grande.";
  if (!eMesValido(mes)) erros.mes = "Escolhe o mês (AAAA-MM).";
  if (nota.length > LIMITE_NOTA) erros.nota = `A nota tem no máximo ${LIMITE_NOTA} caracteres.`;

  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, despesa: { descricao, valor: valor!, mes, categoria, quem, estado, nota } };
}

export function validarReserva(entrada: unknown): { ok: true; valor: number } | { ok: false; erro: string } {
  if (entrada == null || (typeof entrada === "string" && !entrada.trim())) return { ok: true, valor: 0 };
  const v = lerValor(entrada);
  if (v == null || v < 0) return { ok: false, erro: "A reserva tem de ser um número igual ou maior que zero." };
  if (v >= 1e10) return { ok: false, erro: "A reserva é demasiado grande." };
  return { ok: true, valor: v };
}
