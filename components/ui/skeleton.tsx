import * as React from "react";
import { cn } from "@/lib/utils";

/** Componente de shadcn/ui (new-york). Decorativo: el aviso de "cargando" lo da la pantalla con role="status". */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
