import Link from "next/link";
import { cn } from "@/lib/utils";

// Segmented control: two or three options side by side, picked with one tap.
// The touch target is 44 px tall; the pill you see inside is 36.
const TRACK = "bg-surface-muted grid auto-cols-fr grid-flow-col gap-1 rounded-lg px-1";
const TARGET = "group/segment flex h-11 min-w-0 cursor-pointer items-center py-1 outline-none";
const PILL =
  "text-ink-muted flex h-full w-full items-center justify-center rounded-sm px-2 text-center text-sm leading-tight font-medium transition-colors";
const SELECTED = "bg-surface text-ink shadow-segment";

/** Segments that are links (filters that change the address). */
export function SegmentedLinks({
  label,
  options,
  className,
}: {
  /** Name of the group for screen readers, for example "Filter expenses". */
  label: string;
  options: { href: string; text: string; active: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn(TRACK, className)}>
      {options.map((o) => (
        <Link key={o.href} href={o.href} aria-current={o.active ? "page" : undefined} className={TARGET}>
          <span className={cn(PILL, o.active && SELECTED, "group-focus-visible/segment:ring-ring/50 group-focus-visible/segment:ring-3")}>
            {o.text}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Segments that are a form choice (radios). With `onChange` it is controlled by whoever uses it
 * (which has to be a client component); without it, it starts from `value` and runs by itself.
 */
export function SegmentedChoice({
  name,
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  label: string;
  hideLabel?: boolean;
  options: { value: string; text: string }[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-1.5", className)}>
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm leading-none font-medium select-none"}>{label}</legend>
      <div className={TRACK}>
        {options.map((o) => (
          <label key={o.value} className={TARGET}>
            <input
              type="radio"
              name={name}
              value={o.value}
              className="peer sr-only"
              {...(onChange ? { checked: value === o.value, onChange: () => onChange(o.value) } : { defaultChecked: value === o.value })}
            />
            <span
              className={cn(
                PILL,
                "peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-segment peer-focus-visible:ring-ring/50 peer-focus-visible:ring-3",
              )}
            >
              {o.text}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
