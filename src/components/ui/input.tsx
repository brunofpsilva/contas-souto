import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Altura para o dedo e texto sempre a 16px: abaixo disso o iPhone/iPad faz zoom ao tocar no campo.
        // As regras -webkit-date-* põem as datas do iOS alinhadas à esquerda e com a altura certa.
        "h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-card px-3 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-date-and-time-value]:text-left",
        className
      )}
      {...props}
    />
  )
}

export { Input }
