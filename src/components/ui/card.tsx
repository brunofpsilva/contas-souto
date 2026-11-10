import * as React from "react"
import { cn } from "cn"

/** Superfície com contorno, sem sombra. O espaçamento interior é de quem a usa (p-4, ou linhas). */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-xl border bg-card text-card-foreground", className)}
      {...props}
    />
  )
}

/** Título de secção (3 palavras no máximo), com espaço para uma ação à direita. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex min-h-11 items-center justify-between gap-3", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("text-base font-semibold", className)} {...props} />
}

export { Card, CardHeader, CardTitle }
