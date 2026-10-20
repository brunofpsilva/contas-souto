import type { Metadata } from "next";
import { criarDespesa } from "@/actions/despesas";
import { FormDespesa } from "@/components/form-despesa";
import { mesDe } from "@/lib/meses";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function NovaDespesaPage({ searchParams }: PageProps<"/despesas/nova">) {
  const { adicionada } = await searchParams;
  return (
    <>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Nova despesa</h1>
      {adicionada && (
        <p role="status" className="bg-ok-suave text-ok w-fit rounded-lg px-3 py-2 text-sm">
          Despesa adicionada. Podes adicionar a próxima.
        </p>
      )}
      <FormDespesa
        acao={criarDespesa}
        textoBotao="Adicionar"
        permitirOutra
        iniciais={{ descricao: "", valor: "", mes: mesDe(new Date()), categoria: "Outros", quem: "Ambos", estado: "previsto", nota: "" }}
      />
    </>
  );
}
