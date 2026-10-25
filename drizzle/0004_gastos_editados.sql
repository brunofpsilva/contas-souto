CREATE TABLE "gastos_editados" (
	"mes" char(7) PRIMARY KEY NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"atualizado_por" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gastos_editados_valor_positivo" CHECK ("gastos_editados"."valor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "gastos_editados" ADD CONSTRAINT "gastos_editados_atualizado_por_utilizadores_email_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;