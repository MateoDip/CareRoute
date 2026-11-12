import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Componente de shadcn/ui (new-york). Cambio respecto del original: anillo de
 * foco sólido (ver button.tsx). `text-base` en teléfono evita que iOS haga zoom
 * al enfocar el campo; desde md: vuelve a text-sm. Alto de 44 px en el teléfono
 * (objetivo táctil mínimo) y 40 px desde sm:. Fondo de tarjeta, no de página.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 md:text-sm",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
