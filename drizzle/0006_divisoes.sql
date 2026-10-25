CREATE TABLE "divisoes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "divisoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" varchar(40) NOT NULL,
	"orcamento" numeric(12, 2),
	"criado_por" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisoes_orcamento_positivo" CHECK ("divisoes"."orcamento" >= 0)
);
--> statement-breakpoint
ALTER TABLE "despesas" ADD COLUMN "divisao_id" integer;--> statement-breakpoint
ALTER TABLE "divisoes" ADD CONSTRAINT "divisoes_criado_por_utilizadores_email_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisoes" ADD CONSTRAINT "divisoes_atualizado_por_utilizadores_email_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "divisoes_nome_unico" ON "divisoes" USING btree (lower("nome"));--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_divisao_id_divisoes_id_fk" FOREIGN KEY ("divisao_id") REFERENCES "public"."divisoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "despesas_divisao_idx" ON "despesas" USING btree ("divisao_id");--> statement-breakpoint
-- Divisões iniciais (editáveis na app). As despesas existentes ficam sem divisão (Não aplicável).
INSERT INTO "divisoes" ("nome") VALUES ('Geral'), ('Quarto Principal'), ('Quarto Secundário'), ('Sala'), ('Cozinha'), ('Garagem'), ('Despensa');
