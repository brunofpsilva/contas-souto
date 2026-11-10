import type { Metadata } from "next";
import { Seccao } from "@/components/seccao";
import { listarDespesas, listarDivisoes } from "@/lib/dados";
import { calcularOrcamento } from "@/lib/orcamento";
import { FormDivisoes, FormNovaDivisao } from "./form-divisoes";

export const metadata: Metadata = { title: "Editar divisões" };

export default async function EditarDivisoesPage() {
  const [divisoes, despesas] = await Promise.all([listarDivisoes(), listarDespesas()]);
  // Só para saber quantas despesas cada divisão tem (aparece ao apagar).
  const linhas = calcularOrcamento(divisoes, despesas).divisoes;

  return (
    // No telemóvel, o fundo deixa espaço para o botão "Guardar", fixo em baixo.
    <div className="grid max-w-xl gap-6 max-md:pb-4">
      {linhas.length > 0 && (
        <FormDivisoes divisoes={linhas.map((l) => ({ id: l.id!, nome: l.nome, limite: l.orcamento, nDespesas: l.nDespesas }))} />
      )}
      <Seccao titulo="Nova divisão">
        <FormNovaDivisao />
      </Seccao>
    </div>
  );
}
