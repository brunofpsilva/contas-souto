ALTER TABLE "definicoes" ADD COLUMN "data_conclusao_obra" date;--> statement-breakpoint
ALTER TABLE "despesas" ADD COLUMN "na_conclusao_obra" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_um_marco" CHECK (NOT ("despesas"."na_escritura" AND "despesas"."na_conclusao_obra"));