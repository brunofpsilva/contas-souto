"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

/** Lista para ver só as despesas de uma divisão. Escolher uma opção muda o endereço (?divisao=). */
export function FiltroDivisao({ valor, opcoes }: { valor: string; opcoes: { valor: string; texto: string; href: string }[] }) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Filtrar por divisão"
      defaultValue={valor}
      onChange={(e) => {
        const escolhida = opcoes.find((o) => o.valor === e.target.value);
        if (escolhida) router.push(escolhida.href);
      }}
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </NativeSelect>
  );
}
