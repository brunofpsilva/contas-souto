ALTER TABLE "definicoes" ADD COLUMN "data_escritura" date;--> statement-breakpoint
ALTER TABLE "definicoes" ADD COLUMN "meses_apos_escritura" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "definicoes" ADD COLUMN "prestacao" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "despesas" ADD COLUMN "na_escritura" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "definicoes" ADD CONSTRAINT "definicoes_meses_apos_escritura" CHECK ("definicoes"."meses_apos_escritura" BETWEEN 1 AND 36);--> statement-breakpoint
ALTER TABLE "definicoes" ADD CONSTRAINT "definicoes_prestacao_positiva" CHECK ("definicoes"."prestacao" >= 0);--> statement-breakpoint
-- As despesas de "Escritura e impostos" ainda por pagar passam a ser pagas na escritura.
UPDATE "despesas" SET "na_escritura" = true WHERE "categoria" = 'Escritura e impostos' AND "estado" = 'previsto';
