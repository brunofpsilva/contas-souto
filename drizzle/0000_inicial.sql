CREATE TYPE "public"."categoria" AS ENUM('Escritura e impostos', 'Obras', 'Mobília', 'Eletrodomésticos', 'Cozinha', 'Ligações (luz, água, gás, net)', 'Mudança', 'Decoração', 'Outros');--> statement-breakpoint
CREATE TYPE "public"."estado_despesa" AS ENUM('previsto', 'pago');--> statement-breakpoint
CREATE TYPE "public"."origem_sync" AS ENUM('manual', 'cron');--> statement-breakpoint
CREATE TYPE "public"."pessoa" AS ENUM('Ambos', 'Bruno', 'Mafalda');--> statement-breakpoint
CREATE TABLE "contas" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"tipo" text DEFAULT '' NOT NULL,
	"saldo" numeric(14, 2) NOT NULL,
	"moeda" char(3) DEFAULT 'EUR' NOT NULL,
	"sincronizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "definicoes" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"reserva" numeric(12, 2) DEFAULT 0 NOT NULL,
	"contas_escolhidas" text[],
	"atualizado_por" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "definicoes_linha_unica" CHECK ("definicoes"."id" = 1),
	CONSTRAINT "definicoes_reserva_positiva" CHECK ("definicoes"."reserva" >= 0)
);
--> statement-breakpoint
CREATE TABLE "despesas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "despesas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"descricao" varchar(120) NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"mes" char(7) NOT NULL,
	"categoria" "categoria" DEFAULT 'Outros' NOT NULL,
	"quem" "pessoa" DEFAULT 'Ambos' NOT NULL,
	"estado" "estado_despesa" DEFAULT 'previsto' NOT NULL,
	"nota" varchar(200) DEFAULT '' NOT NULL,
	"criado_por" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"pago_por" text,
	"pago_em" timestamp with time zone,
	CONSTRAINT "despesas_valor_positivo" CHECK ("despesas"."valor" >= 0),
	CONSTRAINT "despesas_mes_formato" CHECK ("despesas"."mes" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "despesas_pago_coerente" CHECK ("despesas"."estado" = 'pago' OR ("despesas"."pago_em" IS NULL AND "despesas"."pago_por" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "sincronizacoes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sincronizacoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"origem" "origem_sync" NOT NULL,
	"iniciada_por" text,
	"iniciada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"terminada_em" timestamp with time zone,
	"ok" boolean,
	"mensagem" text,
	"codigo_erro" text,
	"n_contas" integer,
	"wallet_a_sincronizar" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilizadores" (
	"email" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_login" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "definicoes" ADD CONSTRAINT "definicoes_atualizado_por_utilizadores_email_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_criado_por_utilizadores_email_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_atualizado_por_utilizadores_email_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_pago_por_utilizadores_email_fk" FOREIGN KEY ("pago_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizacoes" ADD CONSTRAINT "sincronizacoes_iniciada_por_utilizadores_email_fk" FOREIGN KEY ("iniciada_por") REFERENCES "public"."utilizadores"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "despesas_estado_mes_idx" ON "despesas" USING btree ("estado","mes");--> statement-breakpoint
CREATE INDEX "sincronizacoes_iniciada_idx" ON "sincronizacoes" USING btree ("iniciada_em");