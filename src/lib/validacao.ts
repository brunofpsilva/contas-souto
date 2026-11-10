// Validação dos dados que chegam dos formulários (mesmas regras da versão antiga).
import {
  CATEGORIAS,
  LIMITE_DESCRICAO,
  LIMITE_NOME_DIVISAO,
  LIMITE_NOTA,
  SEM_DIVISAO,
  type Categoria,
  type Estado,
} from "./dominio";
import { mesDaData } from "./escritura";
import { eMesValido, mesPorExtenso } from "./meses";

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
  estado: Estado;
  nota: string;
  naEscritura: boolean;
  naConclusaoObra: boolean;
  /** null = Sem divisão. A ação confirma que a divisão existe. */
  divisaoId: number | null;
}

export type ErrosDespesa = Partial<Record<keyof DadosDespesa, string>>;

/**
 * `dataEscritura` e `dataConclusaoObra` (AAAA-MM-DD) são as datas guardadas nas definições:
 * uma despesa "na escritura" ou "no fim da obra" fica com o mês dessa data. Sem a
 * data definida, não se pode escolher esse marco.
 */
export function validarDespesa(
  input: Record<string, unknown>,
  { dataEscritura = null, dataConclusaoObra = null }: { dataEscritura?: string | null; dataConclusaoObra?: string | null } = {},
): { ok: true; despesa: DadosDespesa } | { ok: false; erros: ErrosDespesa } {
  const erros: ErrosDespesa = {};
  const descricao = String(input.descricao ?? "").trim();
  const valor = lerValor(input.valor);
  const naEscritura = input.quando === "escritura";
  const naConclusaoObra = input.quando === "obra";
  const dataMarco = naEscritura ? dataEscritura : naConclusaoObra ? dataConclusaoObra : null;
  const mes = dataMarco ? mesDaData(dataMarco) : String(input.mes ?? "").trim();
  const categoria = CATEGORIAS.find((c) => c === input.categoria) ?? "Outros";
  const estado: Estado = input.estado === "pago" ? "pago" : "previsto";
  const nota = String(input.nota ?? "").trim();
  const divisaoId = lerIdDivisao(input.divisao);

  if (!descricao) erros.descricao = "A descrição é obrigatória.";
  else if (descricao.length > LIMITE_DESCRICAO) erros.descricao = `A descrição tem no máximo ${LIMITE_DESCRICAO} caracteres.`;
  if (valor == null) erros.valor = "O valor tem de ser um número, por exemplo 1 234,56.";
  else if (valor < 0) erros.valor = "O valor não pode ser negativo.";
  else if (valor >= 1e10) erros.valor = "O valor é demasiado grande.";
  if (naEscritura && !dataEscritura) erros.mes = "Sem data da escritura. Define-se em Definições.";
  else if (naConclusaoObra && !dataConclusaoObra) erros.mes = "Sem data do fim da obra. Define-se em Definições.";
  else if (!eMesValido(mes)) erros.mes = "O mês é obrigatório (AAAA-MM).";
  if (nota.length > LIMITE_NOTA) erros.nota = `A nota tem no máximo ${LIMITE_NOTA} caracteres.`;

  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, despesa: { descricao, valor: valor!, mes, categoria, estado, nota, naEscritura, naConclusaoObra, divisaoId } };
}

/** Id da divisão escolhida no formulário; qualquer outra coisa ("nenhuma", vazio) é Sem divisão. */
export function lerIdDivisao(entrada: unknown): number | null {
  const s = String(entrada ?? "").trim();
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

/** Nome de uma divisão: obrigatório, até LIMITE_NOME_DIVISAO, e não pode ser "Sem divisão". */
export function validarNomeDivisao(entrada: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = String(entrada ?? "").trim().replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "O nome é obrigatório." };
  if (nome.length > LIMITE_NOME_DIVISAO) return { ok: false, erro: `O nome tem no máximo ${LIMITE_NOME_DIVISAO} caracteres.` };
  if (chaveNome(nome) === chaveNome(SEM_DIVISAO)) return { ok: false, erro: `«${SEM_DIVISAO}» é um nome reservado.` };
  return { ok: true, nome };
}

/** Para comparar nomes sem maiúsculas nem acentos ("Sem divisão" = "sem divisao"). */
export function chaveNome(nome: string): string {
  return nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Limite de uma divisão; vazio = sem limite (null). */
export function validarOrcamento(entrada: unknown): { ok: true; valor: number | null } | { ok: false; erro: string } {
  if (entrada == null || (typeof entrada === "string" && !entrada.trim())) return { ok: true, valor: null };
  const v = lerValor(entrada);
  if (v == null || v < 0) return { ok: false, erro: "O limite tem de ser um número igual ou maior que zero." };
  if (v >= 1e10) return { ok: false, erro: "O limite é demasiado grande." };
  return { ok: true, valor: v };
}

/**
 * Formulário de todas as divisões: campos "nome:ID" e "orcamento:ID". Recusa nomes repetidos
 * (sem contar maiúsculas e acentos).
 */
export function validarDivisoes(
  entradas: Iterable<[string, unknown]>,
): { ok: true; divisoes: { id: number; nome: string; orcamento: number | null }[] } | { ok: false; erro: string } {
  const campos = new Map<number, { nome?: unknown; orcamento?: unknown }>();
  for (const [chave, valor] of entradas) {
    const m = /^(nome|orcamento):(\d{1,9})$/.exec(chave);
    if (!m) continue;
    const id = Number(m[2]);
    const c = campos.get(id) ?? {};
    c[m[1] as "nome" | "orcamento"] = valor;
    campos.set(id, c);
  }
  const divisoes: { id: number; nome: string; orcamento: number | null }[] = [];
  const vistos = new Set<string>();
  for (const [id, c] of campos) {
    const nome = validarNomeDivisao(c.nome);
    if (!nome.ok) return nome;
    const orcamento = validarOrcamento(c.orcamento);
    if (!orcamento.ok) return { ok: false, erro: `${nome.nome}: ${orcamento.erro}` };
    const k = chaveNome(nome.nome);
    if (vistos.has(k)) return { ok: false, erro: `Há duas divisões com o nome «${nome.nome}».` };
    vistos.add(k);
    divisoes.push({ id, nome: nome.nome, orcamento: orcamento.valor });
  }
  return { ok: true, divisoes };
}

export function validarReserva(entrada: unknown): { ok: true; valor: number } | { ok: false; erro: string } {
  if (entrada == null || (typeof entrada === "string" && !entrada.trim())) return { ok: true, valor: 0 };
  const v = lerValor(entrada);
  if (v == null || v < 0) return { ok: false, erro: "A reserva mínima tem de ser um número igual ou maior que zero." };
  if (v >= 1e10) return { ok: false, erro: "A reserva mínima é demasiado grande." };
  return { ok: true, valor: v };
}

/**
 * Gastos mensais ajustados à mão: campos "gasto:AAAA-MM". Vazio = volta ao valor
 * automático (fica em `apagar`).
 */
export function validarGastosEditados(
  entradas: Iterable<[string, unknown]>,
): { ok: true; guardar: { mes: string; valor: number }[]; apagar: string[] } | { ok: false; erro: string } {
  const guardar: { mes: string; valor: number }[] = [];
  const apagar: string[] = [];
  for (const [chave, entrada] of entradas) {
    if (!chave.startsWith("gasto:")) continue;
    const mes = chave.slice(6);
    if (!eMesValido(mes)) return { ok: false, erro: "Mês inválido." };
    if (entrada == null || (typeof entrada === "string" && !entrada.trim())) {
      apagar.push(mes);
      continue;
    }
    const v = lerValor(entrada);
    if (v == null || v < 0) return { ok: false, erro: `O valor de ${mesPorExtenso(mes)} tem de ser um número igual ou maior que zero.` };
    if (v >= 1e9) return { ok: false, erro: `O valor de ${mesPorExtenso(mes)} é demasiado grande.` };
    guardar.push({ mes, valor: v });
  }
  return { ok: true, guardar, apagar };
}
