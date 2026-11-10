import { CircleCheck, CircleDashed, CircleX, TriangleAlert } from "lucide-react";
import type { TomEstado } from "@/lib/formato";
import { cn } from "@/lib/utils";

const ICONES = { ok: CircleCheck, aviso: TriangleAlert, mau: CircleX, neutro: CircleDashed } as const;
const TONS: Record<TomEstado, string> = {
  ok: "text-positivo",
  aviso: "text-aviso",
  mau: "text-negativo",
  neutro: "text-texto-suave",
};

/** O estado da previsão, sempre com ícone, texto e cor (nunca só a cor). */
export function EstadoPrevisao({ tom, className, children }: { tom: TomEstado; className?: string; children: React.ReactNode }) {
  const Icone = ICONES[tom];
  return (
    <p role="status" className={cn("flex items-start gap-2 font-semibold", TONS[tom], className)}>
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
