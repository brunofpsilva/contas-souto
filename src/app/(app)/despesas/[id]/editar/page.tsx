import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { atualizarDespesa } from "@/actions/despesas";
import { FormDespesa } from "@/components/form-despesa";
import { db, schema } from "@/db";
import { listarDivisoes, nomesUtilizadores, obterDatas } from "@/lib/dados";
import { dataCurta } from "@/lib/escritura";
import { diaDe } from "@/lib/meses";
import { ApagarDespesa } from "./apagar-despesa";

export const metadata: Metadata = { title: "Editar despesa" };

export default async function EditarDespesaPage({ params }: PageProps<"/despesas/[id]/editar">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [[d], datas, divisoes, nomes] = await Promise.all([
    db.select().from(schema.despesas).where(eq(schema.despesas.id, id)).limit(1),
    obterDatas(),
    listarDivisoes(),
    nomesUtilizadores(),
  ]);
  if (!d) notFound();

  const nome = (email: string | null) => (email ? (nomes.get(email) ?? email) : null);
  const historia = [
    d.criadoPor && `Criada por ${nome(d.criadoPor)}`,
    d.estado === "pago" && d.pagoPor && d.pagoEm && `Paga por ${nome(d.pagoPor)} a ${dataCurta(diaDe(d.pagoEm))}`,
  ].filter(Boolean);

  return (
    <>
      <FormDespesa
        acao={atualizarDespesa.bind(null, d.id)}
        textoBotao="Guardar"
        datas={datas}
        divisoes={divisoes}
        iniciais={{
          descricao: d.descricao,
          valor: String(d.valor).replace(".", ","),
          mes: d.mes,
          quando: d.naEscritura ? "escritura" : d.naConclusaoObra ? "obra" : "mes",
          categoria: d.categoria,
          divisao: d.divisaoId != null ? String(d.divisaoId) : "nenhuma",
          estado: d.estado,
          nota: d.nota,
        }}
      />
      <div className="grid max-w-xl gap-2 border-t pt-4">
        <ApagarDespesa id={d.id} descricao={d.descricao} />
        {historia.length > 0 && <p className="text-texto-suave text-sm">{historia.join(" · ")}</p>}
      </div>
    </>
  );
}
