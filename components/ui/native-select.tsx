import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * <select> nativo con el mismo aspecto que Input (como el NativeSelect de
 * shadcn). Se prefiere al Select propio: en el teléfono abre el selector del
 * sistema y ya trae teclado, foco y lector de pantalla resueltos (clase 11).
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 md:text-sm",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
