"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Amount } from "@/components/amount";
import { useT } from "@/i18n/client";
import { axisMonth, capitalize, compactNumber, monthYear } from "@/lib/format";

export interface BalancePoint {
  /** "today" or the month (YYYY-MM). */
  key: string;
  /** Projected balance at the end of the month (or today's balance). */
  balance: number;
  income: number;
  spending: number;
  expenses: number;
}

const LABEL = { fill: "var(--ink-muted)", fontSize: 12, fontFamily: "var(--font-sans)" };

/**
 * Projected balance from today to the end of the forecast: a single series, with the minimum
 * reserve as a dashed line and a vertical line at each milestone (deed and end of construction).
 */
export function BalanceChart({
  points,
  reserve,
  milestones,
}: {
  points: BalancePoint[];
  reserve: number;
  milestones: { key: string; title: string }[];
}) {
  const t = useT();
  const min = Math.min(0, ...points.map((p) => p.balance));
  const middle = (points.length - 1) / 2;
  const axisLabel = (key: string) => (key === "today" ? t.forecast.todayAxis : axisMonth(t, key));

  return (
    <div className="private-axis h-52 w-full touch-pan-y sm:h-64" role="img" aria-label={t.forecast.chartAria}>
      <AreaChart
        responsive
        data={points}
        margin={{ top: 8 + milestones.length * 16, right: 12, bottom: 0, left: 0 }}
        style={{ width: "100%", height: "100%" }}
      >
        <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
        <XAxis
          dataKey="key"
          tickFormatter={axisLabel}
          tickLine={false}
          axisLine={{ stroke: "var(--line)" }}
          tick={LABEL}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          // Width that fits the labels ("123,5 mil" doesn't fit a fixed width).
          width="auto"
          // Starts at zero (or below, if the balance goes negative) and ends on a round number.
          domain={[min < 0 ? "auto" : 0, "auto"]}
          tickFormatter={(v: number) => compactNumber(t, v)}
          tickLine={false}
          axisLine={false}
          tick={LABEL}
          tickCount={4}
        />
        {min < 0 && <ReferenceLine y={0} stroke="var(--negative)" strokeWidth={1} />}
        {reserve > 0 && (
          <ReferenceLine
            y={reserve}
            ifOverflow="extendDomain"
            stroke="var(--ink-muted)"
            strokeDasharray="4 4"
            strokeWidth={1}
            // On the left, where the balance is usually higher and the line doesn't cross the name.
            label={{ value: t.common.minReserve, position: "insideBottomLeft", ...LABEL }}
          />
        )}
        {milestones.map((m, i) => {
          // The name sits above the chart, on the side of the line with more room.
          const toLeft = points.findIndex((p) => p.key === m.key) > middle;
          return (
            <ReferenceLine
              key={m.title}
              x={m.key}
              stroke="var(--ink-muted)"
              strokeWidth={1}
              label={({ viewBox }: { viewBox: { x: number; y: number } }) => (
                <text
                  x={viewBox.x + (toLeft ? 4 : -4)}
                  y={viewBox.y - 6 - (milestones.length - 1 - i) * 16}
                  textAnchor={toLeft ? "end" : "start"}
                  fill="var(--ink)"
                  fontSize={12}
                  fontWeight={500}
                >
                  {m.title}
                </text>
              )}
            />
          );
        })}
        <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--ink-muted)", strokeWidth: 1 }} isAnimationActive={false} />
        <Area
          type="linear"
          dataKey="balance"
          stroke="var(--brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="var(--brand)"
          fillOpacity={0.1}
          dot={false}
          activeDot={{ r: 5, fill: "var(--brand)", stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={false}
          baseValue={min}
        />
      </AreaChart>
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const t = useT();
  const p = payload?.[0]?.payload as BalancePoint | undefined;
  if (!active || !p) return null;
  const today = p.key === "today";
  return (
    <div className="bg-surface text-ink shadow-floating grid gap-1 rounded-lg border px-3 py-2 text-xs">
      <p className="font-medium">{today ? t.forecast.today : capitalize(monthYear(t, p.key))}</p>
      <Part label={today ? t.common.balanceToday : t.common.projectedBalance}>
        <Amount v={p.balance} whole private className={p.balance < 0 ? "text-negative font-medium" : "font-medium"} />
      </Part>
      {p.income > 0 && (
        <Part label={t.common.income}>
          <Amount v={p.income} whole sign private />
        </Part>
      )}
      {p.spending > 0 && (
        <Part label={t.common.monthlySpending}>
          <Amount v={-p.spending} whole />
        </Part>
      )}
      {p.expenses > 0 && (
        <Part label={t.common.expenses}>
          <Amount v={-p.expenses} whole />
        </Part>
      )}
    </div>
  );
}

function Part({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-6">
      <span className="text-ink-muted">{label}</span>
      {children}
    </p>
  );
}
