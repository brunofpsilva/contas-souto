"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { euros } from "@/lib/formato";
import { mesCurto, mesPorExtenso } from "@/lib/meses";
import { PRIVADO } from "@/lib/privacidade";
import { cn } from "@/lib/utils";

export interface PontoSaldo {
  mes: string;
  saldo: number;
  /** [pessimista, otimista], quando há previsão do dia a dia. */
  banda: [number, number] | null;
  saidas: number;
  atrasadas: number;
  entradasPrevistas: number;
  /** Gastos do dia a dia. */
  saidasPrevistas: number;
}

const compacto = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });

/** Saldo previsto ao fim de cada mês, com a banda pessimista–otimista, a reserva e a escritura. */
export function GraficoSaldo({
  pontos,
  reserva,
  mesEscritura,
}: {
  pontos: PontoSaldo[];
  reserva: number;
  mesEscritura?: string;
}) {
  const valores = pontos.flatMap((p) => [p.saldo, ...(p.banda ?? [])]);
  const min = Math.min(0, reserva, ...valores);
  const max = Math.max(reserva, ...valores);
  const comBanda = pontos.some((p) => p.banda);

  return (
    <div className="privado-eixo h-56 w-full touch-pan-y sm:h-64" role="img" aria-label="Gráfico do saldo previsto mês a mês; os valores estão na tabela abaixo.">
      <AreaChart responsive data={pontos} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="saldo-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primaria)" stopOpacity={0.12} />
            <stop offset="1" stopColor="var(--primaria)" stopOpacity={0.12} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeWidth={1} />
        <XAxis
          dataKey="mes"
          tickFormatter={mesCurto}
          tickLine={false}
          axisLine={{ stroke: "var(--borda)" }}
          tick={{ fill: "var(--texto-suave)", fontSize: 11, fontFamily: "var(--font-sans)" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          // Largura à medida das etiquetas ("123,5 mil" não cabia em 44px e ficava cortado).
          width="auto"
          domain={[min, max]}
          tickFormatter={(v: number) => compacto.format(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--texto-suave)", fontSize: 11, fontFamily: "var(--font-sans)" }}
          tickCount={5}
        />
        {min < 0 && <ReferenceLine y={0} stroke="var(--negativo)" strokeWidth={1} />}
        {reserva > 0 && (
          <ReferenceLine
            y={reserva}
            stroke="var(--texto-suave)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "Reserva", position: "insideTopRight", fill: "var(--texto-suave)", fontSize: 11 }}
          />
        )}
        {mesEscritura && pontos.some((p) => p.mes === mesEscritura) && (
          <ReferenceLine
            x={mesEscritura}
            stroke="var(--texto)"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: "Escritura", position: "insideTopLeft", fill: "var(--texto)", fontSize: 11 }}
          />
        )}
        {comBanda && (
          <Area
            type="linear"
            dataKey="banda"
            stroke="none"
            fill="var(--primaria)"
            fillOpacity={0.14}
            isAnimationActive={false}
            activeDot={false}
          />
        )}
        <Tooltip content={Dica} cursor={{ stroke: "var(--texto-suave)", strokeWidth: 1 }} isAnimationActive={false} />
        <Area
          type="linear"
          dataKey="saldo"
          stroke="var(--primaria)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill={comBanda ? "none" : "url(#saldo-area)"}
          dot={false}
          activeDot={{ r: 5, fill: "var(--primaria)", stroke: "var(--superficie)", strokeWidth: 2 }}
          isAnimationActive={false}
          baseValue={min}
        />
      </AreaChart>
    </div>
  );
}

function Dica({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as PontoSaldo | undefined;
  if (!active || !p) return null;
  return (
    <div className="bg-popover text-popover-foreground grid gap-1 rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-medium first-letter:uppercase">{mesPorExtenso(p.mes)}</p>
      <p className="flex justify-between gap-6">
        <span className="text-muted-foreground">Saldo previsto</span>
        <span className={cn("tabular-nums", p.saldo < 0 && "text-destructive", PRIVADO)}>{euros(p.saldo)}</span>
      </p>
      <p className="flex justify-between gap-6">
        <span className="text-muted-foreground">Saídas no mês</span>
        <span className="tabular-nums">{euros(p.saidas)}</span>
      </p>
      {p.atrasadas > 0 && (
        <p className="flex justify-between gap-6">
          <span className="text-muted-foreground">das quais atrasadas</span>
          <span className="tabular-nums">{euros(p.atrasadas)}</span>
        </p>
      )}
      {p.banda && (
        <>
          <p className="flex justify-between gap-6">
            <span className="text-muted-foreground">Entradas previstas</span>
            <span className={cn("tabular-nums", PRIVADO)}>{euros(p.entradasPrevistas)}</span>
          </p>
          <p className="flex justify-between gap-6">
            <span className="text-muted-foreground">Gastos do dia a dia</span>
            <span className="tabular-nums">{euros(p.saidasPrevistas)}</span>
          </p>
          <p className="flex justify-between gap-6">
            <span className="text-muted-foreground">Intervalo</span>
            <span className={cn("tabular-nums", PRIVADO)}>
              {euros(p.banda[0], { inteiro: true })} a {euros(p.banda[1], { inteiro: true })}
            </span>
          </p>
        </>
      )}
    </div>
  );
}
