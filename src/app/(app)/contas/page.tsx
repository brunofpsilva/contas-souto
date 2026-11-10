import { redirect } from "next/navigation";

// O separador "Contas" passou a "Definições". O endereço antigo continua a funcionar
// (atalhos guardados, app já instalada).
export default function ContasPage() {
  redirect("/definicoes");
}
