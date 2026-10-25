import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { CATEGORIAS, ESTADOS, LIMITE_DESCRICAO, LIMITE_NOME_DIVISAO, LIMITE_NOTA, ORIGENS_SYNC } from "../lib/dominio";

export const categoriaEnum = pgEnum("categoria", CATEGORIAS);
export const estadoEnum = pgEnum("estado_despesa", ESTADOS);
export const origemSyncEnum = pgEnum("origem_sync", ORIGENS_SYNC);

const agora = () => timestamp({ withTimezone: true }).notNull().defaultNow();

/** Quem já entrou na app (atualizado a cada login). Serve para mostrar nomes em vez de emails. */
export const utilizadores = pgTable("utilizadores", {
  email: text().primaryKey(),
  nome: text().notNull(),
  criadoEm: agora(),
  ultimoLogin: agora(),
});

/** Divisões da casa (editáveis na app). Uma despesa sem divisão é "Não aplicável". */
export const divisoes = pgTable(
  "divisoes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    nome: varchar({ length: LIMITE_NOME_DIVISAO }).notNull(),
    /** Orçamento máximo; null = sem orçamento. */
    orcamento: numeric({ precision: 12, scale: 2, mode: "number" }),
    criadoPor: text().references(() => utilizadores.email),
    criadoEm: agora(),
    atualizadoPor: text().references(() => utilizadores.email),
    atualizadoEm: agora(),
  },
  (t) => [
    check("divisoes_orcamento_positivo", sql`${t.orcamento} >= 0`),
    uniqueIndex("divisoes_nome_unico").on(sql`lower(${t.nome})`),
  ],
);

export const despesas = pgTable(
  "despesas",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    descricao: varchar({ length: LIMITE_DESCRICAO }).notNull(),
    valor: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
    /** AAAA-MM */
    mes: char({ length: 7 }).notNull(),
    categoria: categoriaEnum().notNull().default("Outros"),
    estado: estadoEnum().notNull().default("previsto"),
    nota: varchar({ length: LIMITE_NOTA }).notNull().default(""),
    /**
     * Paga na escritura: o mês acompanha a data da escritura (as ações atualizam-no
     * sempre que a data muda). Sem data definida, conta o mês guardado.
     */
    naEscritura: boolean().notNull().default(false),
    /** Paga na conclusão da obra (ao empreiteiro): como `naEscritura`, mas com a data da obra. */
    naConclusaoObra: boolean().notNull().default(false),
    /** Divisão da casa; null = Não aplicável (também quando a divisão é apagada). */
    divisaoId: integer().references(() => divisoes.id, { onDelete: "set null" }),

    criadoPor: text().references(() => utilizadores.email),
    criadoEm: agora(),
    atualizadoPor: text().references(() => utilizadores.email),
    atualizadoEm: agora(),
    pagoPor: text().references(() => utilizadores.email),
    pagoEm: timestamp({ withTimezone: true }),
  },
  (t) => [
    check("despesas_valor_positivo", sql`${t.valor} >= 0`),
    check("despesas_mes_formato", sql`${t.mes} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    // Uma despesa prevista não guarda quem pagou.
    check("despesas_pago_coerente", sql`${t.estado} = 'pago' OR (${t.pagoEm} IS NULL AND ${t.pagoPor} IS NULL)`),
    // Paga na escritura ou na conclusão da obra, nunca nas duas.
    check("despesas_um_marco", sql`NOT (${t.naEscritura} AND ${t.naConclusaoObra})`),
    index("despesas_estado_mes_idx").on(t.estado, t.mes),
    index("despesas_divisao_idx").on(t.divisaoId),
  ],
);

/** Última fotografia das contas do Wallet (substituída a cada sincronização). */
export const contas = pgTable("contas", {
  id: text().primaryKey(), // id do Wallet
  nome: text().notNull(),
  tipo: text().notNull().default(""),
  saldo: numeric({ precision: 14, scale: 2, mode: "number" }).notNull(),
  moeda: char({ length: 3 }).notNull().default("EUR"),
  sincronizadoEm: timestamp({ withTimezone: true }).notNull(),
});

/**
 * Movimentos do Wallet dos últimos 12 meses (substituídos a cada atualização).
 * Só das contas sincronizadas; servem para prever salários e gastos do dia a dia.
 */
export const movimentos = pgTable(
  "movimentos",
  {
    id: text().primaryKey(), // id do Wallet
    contaId: text().notNull(),
    data: timestamp({ withTimezone: true }).notNull(),
    /** AAAA-MM na hora de Lisboa */
    mes: char({ length: 7 }).notNull(),
    /** Com sinal: negativo = saída. */
    valor: numeric({ precision: 14, scale: 2, mode: "number" }).notNull(),
    moeda: char({ length: 3 }).notNull().default("EUR"),
    categoriaId: text(),
    /** Categoria-base, quando a categoria é personalizada. */
    categoriaPaiId: text(),
    categoriaNome: text().notNull().default(""),
    grupo: text().notNull().default(""),
    nota: varchar({ length: LIMITE_NOTA }).notNull().default(""),
    transferencia: boolean().notNull().default(false),
    sincronizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index("movimentos_mes_idx").on(t.mes)],
);

/** Uma única linha (id = 1) com as definições partilhadas. */
export const definicoes = pgTable(
  "definicoes",
  {
    id: integer().primaryKey().default(1),
    reserva: numeric({ precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    /** null = por defeito contam as contas com saldo positivo. */
    contasEscolhidas: text().array(),
    /** AAAA-MM-DD; null = ainda sem data. A previsão vai até esta data. */
    dataEscritura: date({ mode: "string" }),
    /** AAAA-MM-DD; null = ainda sem data. Dia em que se paga o fim da obra ao empreiteiro. */
    dataConclusaoObra: date({ mode: "string" }),
    atualizadoPor: text().references(() => utilizadores.email),
    atualizadoEm: agora(),
  },
  (t) => [check("definicoes_linha_unica", sql`${t.id} = 1`), check("definicoes_reserva_positiva", sql`${t.reserva} >= 0`)],
);

/** Gastos do dia a dia e renda escritos à mão para um ciclo (substituem a previsão automática). */
export const gastosEditados = pgTable(
  "gastos_editados",
  {
    /** Ciclo AAAA-MM. No ciclo atual, é o que ainda falta gastar. */
    mes: char({ length: 7 }).primaryKey(),
    valor: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
    atualizadoPor: text().references(() => utilizadores.email),
    atualizadoEm: agora(),
  },
  (t) => [check("gastos_editados_valor_positivo", sql`${t.valor} >= 0`)],
);

/** Registo de cada sincronização com o Wallet (manual ou do cron). */
export const sincronizacoes = pgTable(
  "sincronizacoes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    origem: origemSyncEnum().notNull(),
    iniciadaPor: text().references(() => utilizadores.email),
    iniciadaEm: agora(),
    terminadaEm: timestamp({ withTimezone: true }),
    ok: boolean(),
    mensagem: text(),
    codigoErro: text(),
    nContas: integer(),
    /** Movimentos lidos nesta sincronização (null = os movimentos não foram atualizados). */
    nMovimentos: integer(),
    /** O Wallet indicou que ainda estava a sincronizar (X-Sync-In-Progress). */
    walletASincronizar: boolean().notNull().default(false),
  },
  (t) => [index("sincronizacoes_iniciada_idx").on(t.iniciadaEm)],
);

export type Despesa = typeof despesas.$inferSelect;
export type NovaDespesa = typeof despesas.$inferInsert;
export type Divisao = typeof divisoes.$inferSelect;
export type Conta = typeof contas.$inferSelect;
export type Movimento = typeof movimentos.$inferSelect;
export type Definicoes = typeof definicoes.$inferSelect;
export type Sincronizacao = typeof sincronizacoes.$inferSelect;
export type Utilizador = typeof utilizadores.$inferSelect;
