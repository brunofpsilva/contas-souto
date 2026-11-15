-- Database names in English. Only renames (tables, columns, enums and their values, constraints,
-- indexes and sequences) and a few stored codes: no data is lost. Written by hand, because
-- drizzle-kit can't tell a rename from a drop + create without asking.

-- Enums. Renaming a value keeps the rows, the column defaults and the checks that use it.
ALTER TYPE "public"."categoria" RENAME TO "expense_category";--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Escritura e impostos' TO 'deed_and_taxes';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Obras' TO 'renovation';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Mobília' TO 'furniture';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Eletrodomésticos' TO 'appliances';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Cozinha' TO 'kitchen';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Ligações (luz, água, gás, net)' TO 'utilities';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Mudança' TO 'moving';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Decoração' TO 'decoration';--> statement-breakpoint
ALTER TYPE "public"."expense_category" RENAME VALUE 'Outros' TO 'other';--> statement-breakpoint
ALTER TYPE "public"."estado_despesa" RENAME TO "expense_status";--> statement-breakpoint
ALTER TYPE "public"."expense_status" RENAME VALUE 'previsto' TO 'planned';--> statement-breakpoint
ALTER TYPE "public"."expense_status" RENAME VALUE 'pago' TO 'paid';--> statement-breakpoint
ALTER TYPE "public"."origem_sync" RENAME TO "sync_source";--> statement-breakpoint

-- users
ALTER TABLE "utilizadores" RENAME TO "users";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "criado_em" TO "created_at";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "ultimo_login" TO "last_login_at";--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "utilizadores_pkey" TO "users_pkey";--> statement-breakpoint

-- rooms
ALTER TABLE "divisoes" RENAME TO "rooms";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "orcamento" TO "budget";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "criado_por" TO "created_by";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "criado_em" TO "created_at";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "atualizado_por" TO "updated_by";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "atualizado_em" TO "updated_at";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "divisoes_pkey" TO "rooms_pkey";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "divisoes_orcamento_positivo" TO "rooms_budget_positive";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "divisoes_criado_por_utilizadores_email_fk" TO "rooms_created_by_users_email_fk";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "divisoes_atualizado_por_utilizadores_email_fk" TO "rooms_updated_by_users_email_fk";--> statement-breakpoint
ALTER INDEX "divisoes_nome_unico" RENAME TO "rooms_name_unique";--> statement-breakpoint
ALTER SEQUENCE "divisoes_id_seq" RENAME TO "rooms_id_seq";--> statement-breakpoint

-- expenses
ALTER TABLE "despesas" RENAME TO "expenses";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "descricao" TO "description";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "valor" TO "amount";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "mes" TO "month";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "categoria" TO "category";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "estado" TO "status";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "nota" TO "note";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "na_escritura" TO "at_deed";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "na_conclusao_obra" TO "at_construction_end";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "divisao_id" TO "room_id";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "criado_por" TO "created_by";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "criado_em" TO "created_at";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "atualizado_por" TO "updated_by";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "atualizado_em" TO "updated_at";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "pago_por" TO "paid_by";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "pago_em" TO "paid_at";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_pkey" TO "expenses_pkey";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_valor_positivo" TO "expenses_amount_positive";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_mes_formato" TO "expenses_month_format";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_pago_coerente" TO "expenses_paid_consistent";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_um_marco" TO "expenses_one_milestone";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_divisao_id_divisoes_id_fk" TO "expenses_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_criado_por_utilizadores_email_fk" TO "expenses_created_by_users_email_fk";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_atualizado_por_utilizadores_email_fk" TO "expenses_updated_by_users_email_fk";--> statement-breakpoint
ALTER TABLE "expenses" RENAME CONSTRAINT "despesas_pago_por_utilizadores_email_fk" TO "expenses_paid_by_users_email_fk";--> statement-breakpoint
ALTER INDEX "despesas_estado_mes_idx" RENAME TO "expenses_status_month_idx";--> statement-breakpoint
ALTER INDEX "despesas_divisao_idx" RENAME TO "expenses_room_idx";--> statement-breakpoint
ALTER SEQUENCE "despesas_id_seq" RENAME TO "expenses_id_seq";--> statement-breakpoint

-- accounts (Wallet). A nameless account is now stored empty; the screen shows the label.
ALTER TABLE "contas" RENAME TO "accounts";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "tipo" TO "type";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "saldo" TO "balance";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "moeda" TO "currency";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "sincronizado_em" TO "synced_at";--> statement-breakpoint
ALTER TABLE "accounts" RENAME CONSTRAINT "contas_pkey" TO "accounts_pkey";--> statement-breakpoint
UPDATE "accounts" SET "name" = '' WHERE "name" = 'Conta sem nome';--> statement-breakpoint

-- transactions (Wallet)
ALTER TABLE "movimentos" RENAME TO "transactions";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "conta_id" TO "account_id";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "data" TO "date";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "mes" TO "month";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "valor" TO "amount";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "moeda" TO "currency";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "categoria_id" TO "category_id";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "categoria_pai_id" TO "parent_category_id";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "categoria_nome" TO "category_name";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "grupo" TO "category_group";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "nota" TO "note";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "transferencia" TO "is_transfer";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "sincronizado_em" TO "synced_at";--> statement-breakpoint
ALTER TABLE "transactions" RENAME CONSTRAINT "movimentos_pkey" TO "transactions_pkey";--> statement-breakpoint
ALTER INDEX "movimentos_mes_idx" RENAME TO "transactions_month_idx";--> statement-breakpoint

-- settings
ALTER TABLE "definicoes" RENAME TO "settings";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "reserva" TO "reserve";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "contas_escolhidas" TO "selected_accounts";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "data_escritura" TO "deed_date";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "data_conclusao_obra" TO "construction_end_date";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "atualizado_por" TO "updated_by";--> statement-breakpoint
ALTER TABLE "settings" RENAME COLUMN "atualizado_em" TO "updated_at";--> statement-breakpoint
ALTER TABLE "settings" RENAME CONSTRAINT "definicoes_pkey" TO "settings_pkey";--> statement-breakpoint
ALTER TABLE "settings" RENAME CONSTRAINT "definicoes_linha_unica" TO "settings_single_row";--> statement-breakpoint
ALTER TABLE "settings" RENAME CONSTRAINT "definicoes_reserva_positiva" TO "settings_reserve_positive";--> statement-breakpoint
ALTER TABLE "settings" RENAME CONSTRAINT "definicoes_atualizado_por_utilizadores_email_fk" TO "settings_updated_by_users_email_fk";--> statement-breakpoint

-- spending_overrides
ALTER TABLE "gastos_editados" RENAME TO "spending_overrides";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME COLUMN "mes" TO "month";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME COLUMN "valor" TO "amount";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME COLUMN "atualizado_por" TO "updated_by";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME COLUMN "atualizado_em" TO "updated_at";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME CONSTRAINT "gastos_editados_pkey" TO "spending_overrides_pkey";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME CONSTRAINT "gastos_editados_valor_positivo" TO "spending_overrides_amount_positive";--> statement-breakpoint
ALTER TABLE "spending_overrides" RENAME CONSTRAINT "gastos_editados_atualizado_por_utilizadores_email_fk" TO "spending_overrides_updated_by_users_email_fk";--> statement-breakpoint

-- syncs. The stored error codes move to the new names (the screen picks its sentence by code).
ALTER TABLE "sincronizacoes" RENAME TO "syncs";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "origem" TO "source";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "iniciada_por" TO "started_by";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "iniciada_em" TO "started_at";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "terminada_em" TO "finished_at";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "mensagem" TO "message";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "codigo_erro" TO "error_code";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "n_contas" TO "account_count";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "n_movimentos" TO "transaction_count";--> statement-breakpoint
ALTER TABLE "syncs" RENAME COLUMN "wallet_a_sincronizar" TO "wallet_syncing";--> statement-breakpoint
ALTER TABLE "syncs" RENAME CONSTRAINT "sincronizacoes_pkey" TO "syncs_pkey";--> statement-breakpoint
ALTER TABLE "syncs" RENAME CONSTRAINT "sincronizacoes_iniciada_por_utilizadores_email_fk" TO "syncs_started_by_users_email_fk";--> statement-breakpoint
ALTER INDEX "sincronizacoes_iniciada_idx" RENAME TO "syncs_started_idx";--> statement-breakpoint
ALTER SEQUENCE "sincronizacoes_id_seq" RENAME TO "syncs_id_seq";--> statement-breakpoint
UPDATE "syncs" SET "error_code" = CASE "error_code"
  WHEN 'sem_token' THEN 'no_token'
  WHEN 'token_invalido' THEN 'invalid_token'
  WHEN 'consentimento' THEN 'consent'
  WHEN 'proibido' THEN 'forbidden'
  WHEN 'sincronizacao_inicial' THEN 'initial_sync'
  WHEN 'limite_pedidos' THEN 'rate_limited'
  WHEN 'erro_servidor' THEN 'server_error'
  WHEN 'erro_http' THEN 'http_error'
  WHEN 'sem_ligacao' THEN 'no_connection'
  WHEN 'formato' THEN 'bad_format'
  WHEN 'a_decorrer' THEN 'in_progress'
  WHEN 'demasiado_cedo' THEN 'too_soon'
  WHEN 'desconhecido' THEN 'unknown'
  ELSE "error_code"
END
WHERE "error_code" IS NOT NULL;
