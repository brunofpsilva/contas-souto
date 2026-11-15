import * as React from "react"
import { cn } from "cn"

/** Outlined surface, no shadow. The inner spacing is up to whoever uses it (p-4, or rows). */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-xl border bg-card text-card-foreground", className)}
      {...props}
    />
  )
}

export { Card }
