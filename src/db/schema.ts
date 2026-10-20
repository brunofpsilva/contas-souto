import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { CATEGORIAS, ESTADOS, LIMITE_DESCRICAO, LIMITE_NOTA, ORIGENS_SYNC, PESSOAS } from "../lib/dominio";

export const categoriaEnum = pgEnum("categoria", CATEGORIAS);
export const pessoaEnum = pgEnum("pessoa", PESSOAS);
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

export const despesas = pgTable(
  "despesas",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    descricao: varchar({ length: LIMITE_DESCRICAO }).notNull(),
    valor: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
    /** AAAA-MM */
    mes: char({ length: 7 }).notNull(),
    categoria: categoriaEnum().notNull().default("Outros"),
    quem: pessoaEnum().notNull().default("Ambos"),
    estado: estadoEnum().notNull().default("previsto"),
    nota: varchar({ length: LIMITE_NOTA }).notNull().default(""),

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
    index("despesas_estado_mes_idx").on(t.estado, t.mes),
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

/** Uma única linha (id = 1) com as definições partilhadas. */
export const definicoes = pgTable(
  "definicoes",
  {
    id: integer().primaryKey().default(1),
    reserva: numeric({ precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    /** null = por defeito contam as contas com saldo positivo. */
    contasEscolhidas: text().array(),
    atualizadoPor: text().references(() => utilizadores.email),
    atualizadoEm: agora(),
  },
  (t) => [check("definicoes_linha_unica", sql`${t.id} = 1`), check("definicoes_reserva_positiva", sql`${t.reserva} >= 0`)],
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
    /** O Wallet indicou que ainda estava a sincronizar (X-Sync-In-Progress). */
    walletASincronizar: boolean().notNull().default(false),
  },
  (t) => [index("sincronizacoes_iniciada_idx").on(t.iniciadaEm)],
);

export type Despesa = typeof despesas.$inferSelect;
export type NovaDespesa = typeof despesas.$inferInsert;
export type Conta = typeof contas.$inferSelect;
export type Definicoes = typeof definicoes.$inferSelect;
export type Sincronizacao = typeof sincronizacoes.$inferSelect;
export type Utilizador = typeof utilizadores.$inferSelect;
