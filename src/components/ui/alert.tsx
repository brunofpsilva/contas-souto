import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Mensagem dentro do ecrã. Com um ícone como primeiro filho, o texto alinha ao lado dele.
const alertVariants = cva(
  "grid w-full gap-x-2 gap-y-1 rounded-lg px-3 py-2.5 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        neutro: "bg-secondary text-foreground",
        positivo: "bg-positivo-suave text-positivo",
        aviso: "bg-aviso-suave text-aviso",
        negativo: "bg-negativo-suave text-negativo",
      },
    },
    defaultVariants: {
      variant: "neutro",
    },
  }
)

/** Por defeito é um "status" (lido sem interromper); os erros passam role="alert". */
function Alert({
  className,
  variant,
  role = "status",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
