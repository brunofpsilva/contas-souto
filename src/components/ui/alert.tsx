import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Message inside the screen. With an icon as the first child, the text lines up next to it.
const alertVariants = cva(
  "grid w-full gap-x-2 gap-y-1 rounded-lg px-3 py-2.5 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        neutral: "bg-secondary text-foreground",
        positive: "bg-positive-muted text-positive",
        warning: "bg-warning-muted text-warning",
        negative: "bg-negative-muted text-negative",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

/** A "status" by default (read without interrupting); errors pass role="alert". */
function Alert({
  className,
  variant,
  role = "status",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
