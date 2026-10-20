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

export interface PontoSaldo {
  mes: string;
  saldo: number;
  saidas: number;
  atrasadas: number;
}

const compacto = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });

/** Saldo previsto ao fim de cada mês (uma série), com a linha da reserva. */
export function GraficoSaldo({ pontos, reserva }: { pontos: PontoSaldo[]; reserva: number }) {
  const min = Math.min(0, reserva, ...pontos.map((p) => p.saldo));
  const max = Math.max(reserva, ...pontos.map((p) => p.saldo));

  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfico do saldo previsto mês a mês; os valores estão na tabela ao lado.">
      <AreaChart responsive data={pontos} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="saldo-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--grafico-1)" stopOpacity={0.12} />
            <stop offset="1" stopColor="var(--grafico-1)" stopOpacity={0.12} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="mes"
          tickFormatter={mesCurto}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          width={44}
          domain={[min, max]}
          tickFormatter={(v: number) => compacto.format(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickCount={5}
        />
        {min < 0 && <ReferenceLine y={0} stroke="var(--destructive)" strokeWidth={1} />}
        {reserva > 0 && (
          <ReferenceLine
            y={reserva}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "Reserva", position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }}
          />
        )}
        <Tooltip content={Dica} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} isAnimationActive={false} />
        <Area
          type="linear"
          dataKey="saldo"
          stroke="var(--grafico-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="url(#saldo-area)"
          dot={false}
          activeDot={{ r: 5, fill: "var(--grafico-1)", stroke: "var(--card)", strokeWidth: 2 }}
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
        <span className={p.saldo < 0 ? "text-destructive font-mono" : "font-mono"}>{euros(p.saldo)}</span>
      </p>
      <p className="flex justify-between gap-6">
        <span className="text-muted-foreground">Saídas no mês</span>
        <span className="font-mono">{euros(p.saidas)}</span>
      </p>
      {p.atrasadas > 0 && (
        <p className="flex justify-between gap-6">
          <span className="text-muted-foreground">das quais atrasadas</span>
          <span className="font-mono">{euros(p.atrasadas)}</span>
        </p>
      )}
    </div>
  );
}
