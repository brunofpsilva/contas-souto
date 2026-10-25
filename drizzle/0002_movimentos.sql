CREATE TABLE "movimentos" (
	"id" text PRIMARY KEY NOT NULL,
	"conta_id" text NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"mes" char(7) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"moeda" char(3) DEFAULT 'EUR' NOT NULL,
	"categoria_id" text,
	"categoria_pai_id" text,
	"categoria_nome" text DEFAULT '' NOT NULL,
	"grupo" text DEFAULT '' NOT NULL,
	"nota" varchar(200) DEFAULT '' NOT NULL,
	"transferencia" boolean DEFAULT false NOT NULL,
	"sincronizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sincronizacoes" ADD COLUMN "n_movimentos" integer;--> statement-breakpoint
CREATE INDEX "movimentos_mes_idx" ON "movimentos" USING btree ("mes");