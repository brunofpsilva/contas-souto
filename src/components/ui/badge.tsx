import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Etiqueta curta. O tom diz o estado, e vem sempre com texto (e ícone, quando é um aviso).
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        neutro: "bg-secondary text-foreground",
        positivo: "bg-positivo-suave text-positivo",
        aviso: "bg-aviso-suave text-aviso",
        negativo: "bg-negativo-suave text-negativo",
        contorno: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutro",
    },
  }
)

function Badge({
  className,
  variant = "neutro",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
