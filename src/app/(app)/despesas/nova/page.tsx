import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { criarDespesa } from "@/actions/despesas";
import { FormDespesa } from "@/components/form-despesa";
import { Alert } from "@/components/ui/alert";
import { cicloDe } from "@/lib/ciclo";
import { listarDivisoes, obterDatas } from "@/lib/dados";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function NovaDespesaPage({ searchParams }: PageProps<"/despesas/nova">) {
  const [{ adicionada, divisao }, datas, divisoes] = await Promise.all([searchParams, obterDatas(), listarDivisoes()]);
  return (
    <>
      {adicionada && (
        <Alert variant="positivo" className="max-w-xl">
          <CircleCheck aria-hidden />
          <span>Despesa adicionada.</span>
        </Alert>
      )}
      <FormDespesa
        acao={criarDespesa}
        textoBotao="Adicionar despesa"
        permitirOutra
        datas={datas}
        divisoes={divisoes}
        iniciais={{
          descricao: "",
          valor: "",
          mes: cicloDe(new Date()),
          quando: "mes",
          categoria: "Outros",
          // Vindo de uma lista filtrada por divisão (?divisao=ID), já vem escolhida.
          divisao: typeof divisao === "string" ? divisao : "nenhuma",
          estado: "previsto",
          nota: "",
        }}
      />
    </>
  );
}
