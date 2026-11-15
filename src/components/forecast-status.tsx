import { CircleCheck, CircleDashed, CircleX, TriangleAlert } from "lucide-react";
import type { Tone } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS = { ok: CircleCheck, warning: TriangleAlert, bad: CircleX, neutral: CircleDashed } as const;
const TONES: Record<Tone, string> = {
  ok: "text-positive",
  warning: "text-warning",
  bad: "text-negative",
  neutral: "text-ink-muted",
};

/** The forecast status, always with an icon, text and colour (never colour alone). */
export function ForecastStatus({ tone, className, children }: { tone: Tone; className?: string; children: React.ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <p role="status" className={cn("flex items-start gap-2 font-semibold", TONES[tone], className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
