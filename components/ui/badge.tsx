import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Componente de shadcn/ui (new-york). Cambios respecto del original:
 *  - `destructive` usa destructive-foreground (contraste en tema oscuro).
 *  - Variantes suaves (fondo teñido, texto oscuro): `suave`, `destructivo-suave`
 *    y las cuatro del triaje (`rojo`, `naranja`, `amarillo`, `verde`). Este
 *    archivo no sabe qué significa cada una: la traducción del dominio (qué
 *    nivel va con qué color) vive en components/estado-solicitud.tsx.
 * Un badge siempre lleva texto: el color nunca es el único dato.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-input text-foreground",
        suave: "border-transparent bg-accent text-primary",
        "destructivo-suave": "border-transparent bg-destructive-suave text-destructive",
        rojo: "border-triaje-rojo/40 bg-triaje-rojo-suave text-triaje-rojo-texto",
        naranja: "border-triaje-naranja/40 bg-triaje-naranja-suave text-triaje-naranja-texto",
        amarillo: "border-triaje-amarillo/60 bg-triaje-amarillo-suave text-triaje-amarillo-texto",
        verde: "border-triaje-verde/40 bg-triaje-verde-suave text-triaje-verde-texto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
