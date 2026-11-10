"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Valor } from "@/components/valor";
import { maiuscula } from "@/lib/formato";
import { mesNoEixo, mesPorExtenso } from "@/lib/meses";

export interface PontoSaldo {
  /** "hoje" ou o mês (AAAA-MM). */
  chave: string;
  /** Saldo previsto no fim do mês (ou o saldo de hoje). */
  saldo: number;
  entradas: number;
  gastos: number;
  despesas: number;
}

const compacto = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });
const ETIQUETA = { fill: "var(--texto-suave)", fontSize: 12, fontFamily: "var(--font-sans)" };

const rotuloEixo = (chave: string) => (chave === "hoje" ? "hoje" : mesNoEixo(chave));

/**
 * Saldo previsto de hoje até ao fim da previsão: uma só série, com a reserva mínima a
 * tracejado e uma linha vertical em cada marco (escritura e fim da obra).
 */
export function GraficoSaldo({
  pontos,
  reserva,
  marcos,
}: {
  pontos: PontoSaldo[];
  reserva: number;
  marcos: { chave: string; titulo: string }[];
}) {
  const min = Math.min(0, ...pontos.map((p) => p.saldo));
  const metade = (pontos.length - 1) / 2;

  return (
    <div
      className="privado-eixo h-52 w-full touch-pan-y sm:h-64"
      role="img"
      aria-label='Gráfico do saldo previsto por mês. Os valores estão na lista "Mês a mês".'
    >
      <AreaChart responsive data={pontos} margin={{ top: 8 + marcos.length * 16, right: 12, bottom: 0, left: 0 }} style={{ width: "100%", height: "100%" }}>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeWidth={1} />
        <XAxis
          dataKey="chave"
          tickFormatter={rotuloEixo}
          tickLine={false}
          axisLine={{ stroke: "var(--borda)" }}
          tick={ETIQUETA}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          // Largura à medida das etiquetas ("123,5 mil" não cabe numa largura fixa).
          width="auto"
          // Começa em zero (ou abaixo, se o saldo ficar negativo) e acaba num valor redondo.
          domain={[min < 0 ? "auto" : 0, "auto"]}
          tickFormatter={(v: number) => compacto.format(v)}
          tickLine={false}
          axisLine={false}
          tick={ETIQUETA}
          tickCount={4}
        />
        {min < 0 && <ReferenceLine y={0} stroke="var(--negativo)" strokeWidth={1} />}
        {reserva > 0 && (
          <ReferenceLine
            y={reserva}
            ifOverflow="extendDomain"
            stroke="var(--texto-suave)"
            strokeDasharray="4 4"
            strokeWidth={1}
            // À esquerda, onde o saldo costuma estar mais alto e a linha não passa por cima do nome.
            label={{ value: "Reserva mínima", position: "insideBottomLeft", ...ETIQUETA }}
          />
        )}
        {marcos.map((m, i) => {
          // O nome fica por cima do gráfico, do lado da linha que tem mais espaço.
          const aEsquerda = pontos.findIndex((p) => p.chave === m.chave) > metade;
          return (
            <ReferenceLine
              key={m.titulo}
              x={m.chave}
              stroke="var(--texto-suave)"
              strokeWidth={1}
              label={({ viewBox }: { viewBox: { x: number; y: number } }) => (
                <text
                  x={viewBox.x + (aEsquerda ? 4 : -4)}
                  y={viewBox.y - 6 - (marcos.length - 1 - i) * 16}
                  textAnchor={aEsquerda ? "end" : "start"}
                  fill="var(--texto)"
                  fontSize={12}
                  fontWeight={500}
                >
                  {m.titulo}
                </text>
              )}
            />
          );
        })}
        <Tooltip content={Dica} cursor={{ stroke: "var(--texto-suave)", strokeWidth: 1 }} isAnimationActive={false} />
        <Area
          type="linear"
          dataKey="saldo"
          stroke="var(--primaria)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="var(--primaria)"
          fillOpacity={0.1}
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
    <div className="bg-superficie text-texto shadow-flutuante grid gap-1 rounded-lg border px-3 py-2 text-xs">
      <p className="font-medium">{p.chave === "hoje" ? "Hoje" : maiuscula(mesPorExtenso(p.chave))}</p>
      <Parcela rotulo={p.chave === "hoje" ? "Saldo hoje" : "Saldo previsto"}>
        <Valor v={p.saldo} inteiro privado className={p.saldo < 0 ? "text-negativo font-medium" : "font-medium"} />
      </Parcela>
      {p.entradas > 0 && (
        <Parcela rotulo="Entradas">
          <Valor v={p.entradas} inteiro sinal privado />
        </Parcela>
      )}
      {p.gastos > 0 && (
        <Parcela rotulo="Gastos mensais">
          <Valor v={-p.gastos} inteiro />
        </Parcela>
      )}
      {p.despesas > 0 && (
        <Parcela rotulo="Despesas">
          <Valor v={-p.despesas} inteiro />
        </Parcela>
      )}
    </div>
  );
}

function Parcela({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-6">
      <span className="text-texto-suave">{rotulo}</span>
      {children}
    </p>
  );
}
