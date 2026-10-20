import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { atualizarDespesa } from "@/actions/despesas";
import { FormDespesa } from "@/components/form-despesa";
import { db, schema } from "@/db";

export const metadata: Metadata = { title: "Editar despesa" };

export default async function EditarDespesaPage({ params }: PageProps<"/despesas/[id]/editar">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [d] = await db.select().from(schema.despesas).where(eq(schema.despesas.id, id)).limit(1);
  if (!d) notFound();

  return (
    <>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Editar despesa</h1>
      <FormDespesa
        acao={atualizarDespesa.bind(null, d.id)}
        textoBotao="Guardar alterações"
        iniciais={{
          descricao: d.descricao,
          valor: String(d.valor).replace(".", ","),
          mes: d.mes,
          categoria: d.categoria,
          quem: d.quem,
          estado: d.estado,
          nota: d.nota,
        }}
      />
    </>
  );
}
