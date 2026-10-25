import type { Metadata } from "next";
import { criarDespesa } from "@/actions/despesas";
import { FormDespesa } from "@/components/form-despesa";
import { listarDivisoes, obterDatas } from "@/lib/dados";
import { cicloDe } from "@/lib/ciclo";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function NovaDespesaPage({ searchParams }: PageProps<"/despesas/nova">) {
  const [{ adicionada, divisao }, datas, divisoes] = await Promise.all([searchParams, obterDatas(), listarDivisoes()]);
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
        datas={datas}
        divisoes={divisoes}
        iniciais={{
          descricao: "",
          valor: "",
          mes: cicloDe(new Date()),
          quando: "mes",
          categoria: "Outros",
          // Vindo da página Orçamento (?divisao=ID), já vem escolhida.
          divisao: typeof divisao === "string" ? divisao : "nenhuma",
          quem: "Ambos",
          estado: "previsto",
          nota: "",
        }}
      />
    </>
  );
}
